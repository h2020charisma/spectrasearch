package net.ideaconsult.spectrasearch.auth;

import java.net.URI;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Comparator;

import io.quarkus.oidc.AccessTokenCredential;
import io.quarkus.oidc.IdTokenCredential;
import io.quarkus.oidc.OidcSession;
import io.quarkus.oidc.RefreshToken;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.CurrentIdentityAssociation;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonValue;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

@Path("/api/auth")
public class AuthResource {
    private static final String NO_STORE = "no-store";
    private static final String POST_LOGOUT_COOKIE = "q_post_logout";

    @Inject
    CurrentIdentityAssociation identityAssociation;

    @Inject
    OidcSession oidcSession;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("/session")
    public Uni<Response> session() {
        return identityAssociation.getDeferredIdentity()
                .onItem().transform(this::sessionResponse);
    }

    @GET
    @Path("/login")
    @Authenticated
    public Response login(@Context UriInfo uriInfo) {
        URI probe = uriInfo.getBaseUri().resolve("auth-probe.html");
        return Response.seeOther(probe).header("Cache-Control", NO_STORE).build();
    }

    @GET
    @Path("/diagnostics")
    @Authenticated
    public Response diagnostics() {
        AccessTokenCredential accessToken = securityIdentity.getCredential(AccessTokenCredential.class);
        IdTokenCredential idToken = securityIdentity.getCredential(IdTokenCredential.class);
        RefreshToken refreshToken = securityIdentity.getCredential(RefreshToken.class);
        JsonObject body = Json.createObjectBuilder()
                .add("accessTokenBytes", tokenBytes(accessToken))
                .add("idTokenBytes", tokenBytes(idToken))
                .add("refreshTokenBytes", tokenBytes(refreshToken))
                .add("roleCount", jwtArraySize(accessToken, "roles"))
                .add("allowedOriginCount", jwtArraySize(accessToken, "allowed-origins"))
                .add("accessTokenIssuedAt", jwtLongClaim(accessToken, "iat"))
                .add("accessTokenExpiresAt", jwtLongClaim(accessToken, "exp"))
                .add("accessTokenClaims", jwtClaimShape(accessToken == null ? null : accessToken.getToken()))
                .add("idTokenClaims", jwtClaimShape(idToken == null ? null : idToken.getToken()))
                .build();
        return json(body, Response.Status.OK);
    }

    @POST
    @Path("/local-logout")
    @Authenticated
    public Uni<Response> localLogout() {
        return oidcSession.logout()
                .replaceWith(Response.noContent().header("Cache-Control", NO_STORE).build());
    }

    @GET
    @Path("/logged-out")
    public Response loggedOut(@QueryParam("state") String state,
            @CookieParam(POST_LOGOUT_COOKIE) String expectedState) {
        if (!sameValue(state, expectedState)) {
            return json(Json.createObjectBuilder().add("logoutStateValid", false).build(), Response.Status.BAD_REQUEST);
        }

        return Response.ok(Json.createObjectBuilder().add("logoutStateValid", true).build().toString(),
                MediaType.APPLICATION_JSON_TYPE)
                .header("Cache-Control", NO_STORE)
                .header("Set-Cookie", POST_LOGOUT_COOKIE
                        + "=; Max-Age=0; Path=/search/; Secure; HttpOnly; SameSite=Lax")
                .build();
    }

    private Response sessionResponse(SecurityIdentity identity) {
        var body = Json.createObjectBuilder().add("authenticated", !identity.isAnonymous());
        if (!identity.isAnonymous()) {
            body.add("name", identity.getPrincipal().getName());
        }
        return json(body.build(), Response.Status.OK);
    }

    private static int tokenBytes(AccessTokenCredential token) {
        return token == null ? 0 : token.getToken().getBytes(StandardCharsets.UTF_8).length;
    }

    private static int tokenBytes(IdTokenCredential token) {
        return token == null ? 0 : token.getToken().getBytes(StandardCharsets.UTF_8).length;
    }

    private static int tokenBytes(RefreshToken token) {
        return token == null ? 0 : token.getToken().getBytes(StandardCharsets.UTF_8).length;
    }

    private static JsonArrayBuilder jwtClaimShape(String token) {
        var summary = Json.createArrayBuilder();
        if (token == null) {
            return summary;
        }
        String[] segments = token.split("\\.");
        if (segments.length < 2) {
            return summary;
        }
        String payload = new String(Base64.getUrlDecoder().decode(segments[1]), StandardCharsets.UTF_8);
        try (var reader = Json.createReader(new StringReader(payload))) {
            JsonObject claims = reader.readObject();
            claims.entrySet().stream()
                    .sorted(Comparator.comparing(java.util.Map.Entry::getKey))
                    .forEach(entry -> summary.add(Json.createObjectBuilder()
                            .add("name", entry.getKey())
                            .add("type", entry.getValue().getValueType().name().toLowerCase())
                            .add("cardinality", cardinality(entry.getValue()))
                            .add("nestedValues", nestedValues(entry.getValue()))
                            .add("jsonBytes", entry.getValue().toString().getBytes(StandardCharsets.UTF_8).length)));
        }
        return summary;
    }

    private static int cardinality(JsonValue value) {
        return switch (value.getValueType()) {
            case ARRAY -> value.asJsonArray().size();
            case OBJECT -> value.asJsonObject().size();
            case NULL -> 0;
            default -> 1;
        };
    }

    private static int nestedValues(JsonValue value) {
        return switch (value.getValueType()) {
            case ARRAY -> value.asJsonArray().stream().mapToInt(AuthResource::nestedValues).sum();
            case OBJECT -> value.asJsonObject().values().stream().mapToInt(AuthResource::nestedValues).sum();
            case NULL -> 0;
            default -> 1;
        };
    }

    private static int jwtArraySize(AccessTokenCredential credential, String claim) {
        if (credential == null) {
            return 0;
        }
        String[] segments = credential.getToken().split("\\.");
        if (segments.length < 2) {
            return 0;
        }
        String payload = new String(Base64.getUrlDecoder().decode(segments[1]), StandardCharsets.UTF_8);
        try (var reader = Json.createReader(new StringReader(payload))) {
            var array = reader.readObject().getJsonArray(claim);
            return array == null ? 0 : array.size();
        }
    }

    private static long jwtLongClaim(AccessTokenCredential credential, String claim) {
        if (credential == null) {
            return 0;
        }
        String[] segments = credential.getToken().split("\\.");
        if (segments.length < 2) {
            return 0;
        }
        String payload = new String(Base64.getUrlDecoder().decode(segments[1]), StandardCharsets.UTF_8);
        try (var reader = Json.createReader(new StringReader(payload))) {
            return reader.readObject().getJsonNumber(claim).longValue();
        }
    }

    private static Response json(JsonObject body, Response.Status status) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON_TYPE)
                .entity(body.toString())
                .header("Cache-Control", NO_STORE)
                .build();
    }

    private static boolean sameValue(String actual, String expected) {
        if (actual == null || expected == null) {
            return false;
        }
        return MessageDigest.isEqual(actual.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8));
    }
}
