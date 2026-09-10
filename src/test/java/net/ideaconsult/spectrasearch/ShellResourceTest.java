package net.ideaconsult.spectrasearch;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;

import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.json.JsonString;

@QuarkusTest
class ShellResourceTest {
    private static final String APP_MARKER = "<div id=\"root\"></div>";
    private static final Pattern ASSET_PATH = Pattern.compile("/search/(assets/[^\"']+\\.(?:js|css))");

    @Test
    void servesEverySpaRouteClassForHtmlRequests() {
        for (String route : routeExamples()) {
            given().accept("text/html")
                    .when().get(route)
                    .then().statusCode(200)
                    .contentType(containsString("text/html"))
                    .header("Cache-Control", equalTo("no-cache"))
                    .body(containsString(APP_MARKER));
        }
    }

    @Test
    void supportsHeadWithoutReturningTheIndexBody() {
        given().accept("text/html")
                .when().head("/predictions/example")
                .then().statusCode(200)
                .contentType(containsString("text/html"))
                .body(equalTo(""));
    }

    @Test
    void servesEncodedViewerDomainsAndNonTraversalDots() {
        given().urlEncodingEnabled(false).accept("text/html")
                .when().get("/h5web/%2Fbucket%2Fexample.h5")
                .then().statusCode(200)
                .body(containsString(APP_MARKER));

        given().urlEncodingEnabled(false).accept("text/html")
                .when().get("/hits/%2evidence/spectrum")
                .then().statusCode(200)
                .body(containsString(APP_MARKER));
    }

    @Test
    void rejectsMalformedRawRequestTargetsBeforeSpaRouting() throws IOException {
        List<String> malformed = List.of(
                "/hits/example/../missing",
                "/hits/example/./missing",
                "/hits/example/%2e%2e/missing",
                "/hits/example/.%2e/missing",
                "/hits/example/%2e./missing",
                "/hits/example/%2e%2e%2fmissing",
                "/hits/example/%2f%2e%2e%2fmissing",
                "/hits//example",
                "/predictions;v=1",
                "/predictions%3Bv=1",
                "/hits/example%5Ctail",
                "/hits/example/%00",
                "/hits/example/%",
                "/hits/example/%2",
                "/hits/example/%GG",
                "/hits/example/%C0%AE");

        for (String target : malformed) {
            RawResponse response = rawGet(target);
            assertTrue(response.status() >= 400 && response.status() < 500,
                    () -> target + " returned " + response.status());
            assertFalse(response.body().contains(APP_MARKER), () -> target + " returned the SPA shell");
        }
    }

    @Test
    void doesNotUseTheSpaForUnknownReservedStaticOrWrongMethodRequests() {
        List<String> missing = List.of(
                "/unknown",
                "/api/future",
                "/api/future/route",
                "/q/health",
                "/management/status",
                "/health/missing",
                "/assets/missing.js",
                "/missing.css",
                "/missing.json");

        for (String path : missing) {
            given().accept("text/html")
                    .when().get(path)
                    .then().statusCode(404)
                    .body(not(containsString(APP_MARKER)));
        }

        given().accept("text/html")
                .when().post("/predictions")
                .then().statusCode(405)
                .body(not(containsString(APP_MARKER)));

        given().accept("application/json")
                .when().get("/predictions")
                .then().statusCode(406)
                .body(not(containsString(APP_MARKER)));
    }

    @Test
    void servesTheSelectedConfigWithNoStore() {
        given().accept("application/json")
                .when().get("/config.json")
                .then().statusCode(200)
                .contentType(containsString("application/json"))
                .header("Cache-Control", equalTo("no-store"))
                .body("apiBaseUrl", equalTo("https://api.ramanchada.ideaconsult.net/"));
    }

    @Test
    void servesHealthOutsideTheSpa() {
        given().accept("application/json")
                .when().get("/health")
                .then().statusCode(200)
                .contentType(containsString("application/json"))
                .header("Cache-Control", equalTo("no-store"))
                .body("status", equalTo("UP"))
                .body(not(containsString(APP_MARKER)));
    }

    @Test
    void servesBuiltAssetsWithTheirMimeTypesAndImmutableCaching() {
        String index = given().accept("text/html")
                .when().get("/")
                .then().statusCode(200)
                .extract().asString();
        Matcher matcher = ASSET_PATH.matcher(index);
        if (!matcher.find()) {
            throw new AssertionError("No generated JavaScript or CSS asset was referenced by index.html");
        }

        String assetPath = "/" + matcher.group(1);
        given().when().get(assetPath)
                .then().statusCode(200)
                .contentType(containsString(assetPath.endsWith(".css") ? "text/css" : "javascript"))
                .header("Cache-Control", equalTo("public,max-age=31536000,immutable"))
                .body(not(containsString(APP_MARKER)));
    }

    @Test
    void servesTheServiceWorkerAsJavaScriptWithoutImmutableCaching() {
        given().when().get("/serviceWorker.js")
                .then().statusCode(200)
                .contentType(containsString("javascript"))
                .header("Cache-Control", equalTo("no-cache"))
                .body(containsString("self.addEventListener"));
    }

    @Test
    void doesNotServeTheExternalPrefixDirectly() {
        given().accept("text/html")
                .when().get("/search/")
                .then().statusCode(404)
                .body(not(containsString(APP_MARKER)));
    }

    private static List<String> routeExamples() {
        Path contractPath = Path.of("src/route-contract.json");
        try (InputStream input = Files.newInputStream(contractPath); JsonReader reader = Json.createReader(input)) {
            return reader.readArray().stream()
                    .map(value -> value.asJsonObject())
                    .flatMap(route -> shellExamples(route).stream())
                    .map(JsonString::getString)
                    .toList();
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot read " + contractPath, exception);
        }
    }

    private static List<JsonString> shellExamples(JsonObject route) {
        List<JsonString> examples = route.getJsonArray("shellExamples").getValuesAs(JsonString.class);
        assertFalse(examples.isEmpty(), () -> route.getString("id") + " has no shell example");
        return examples;
    }

    private static RawResponse rawGet(String target) throws IOException {
        try (Socket socket = new Socket("127.0.0.1", RestAssured.port)) {
            String request = "GET " + target + " HTTP/1.1\r\n"
                    + "Host: 127.0.0.1:" + RestAssured.port + "\r\n"
                    + "Accept: text/html\r\n"
                    + "Connection: close\r\n\r\n";
            socket.getOutputStream().write(request.getBytes(StandardCharsets.ISO_8859_1));
            String response = new String(socket.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int statusStart = response.indexOf(' ') + 1;
            int statusEnd = response.indexOf(' ', statusStart);
            int bodyStart = response.indexOf("\r\n\r\n");
            return new RawResponse(
                    Integer.parseInt(response.substring(statusStart, statusEnd)),
                    bodyStart >= 0 ? response.substring(bodyStart + 4) : "");
        }
    }

    private record RawResponse(int status, String body) {
    }
}
