package net.ideaconsult.spectrasearch;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.regex.Pattern;

import org.jboss.logging.Logger;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.json.JsonString;

@Startup
@ApplicationScoped
public class RuntimeConfig {
    private static final Logger LOG = Logger.getLogger(RuntimeConfig.class);
    private static final Pattern PROFILE_NAME = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]*\\.json");

    private final byte[] content;

    @Inject
    RuntimeConfig(@ConfigProperty(name = "spectrasearch.config-file", defaultValue = "spectra.json") String profileName) {
        this.content = loadProfile(profileName, Thread.currentThread().getContextClassLoader());
        LOG.infof("Selected frontend config: %s", profileName);
    }

    byte[] content() {
        return content;
    }

    static byte[] loadProfile(String profileName, ClassLoader classLoader) {
        if (profileName == null || !PROFILE_NAME.matcher(profileName).matches() || profileName.contains("..")) {
            throw new IllegalStateException("Invalid SPECTRASEARCH_CONFIG_FILE: " + profileName);
        }

        String resourceName = "META-INF/resources/configs/" + profileName;
        byte[] bytes;
        try (InputStream input = classLoader.getResourceAsStream(resourceName)) {
            if (input == null) {
                throw new IllegalStateException("Frontend configuration not found: " + resourceName);
            }
            bytes = input.readAllBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("Cannot load frontend configuration: " + resourceName, exception);
        }

        try (JsonReader reader = Json.createReader(new ByteArrayInputStream(bytes))) {
            JsonObject document = reader.readObject();
            if (!(document.get("apiBaseUrl") instanceof JsonString apiBaseUrl)
                    || apiBaseUrl.getString().isBlank()) {
                throw new IllegalStateException("Frontend configuration must contain a non-empty apiBaseUrl: " + resourceName);
            }
        } catch (RuntimeException exception) {
            if (exception instanceof IllegalStateException) {
                throw exception;
            }
            throw new IllegalStateException("Invalid frontend configuration JSON: " + resourceName, exception);
        }

        return bytes;
    }
}
