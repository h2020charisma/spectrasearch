package net.ideaconsult.spectrasearch.auth;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

import io.quarkus.runtime.StartupEvent;
import io.quarkus.runtime.configuration.ConfigurationException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

@ApplicationScoped
public class OidcRuntimeConfiguration {
    private static final List<String> REQUIRED_PROPERTIES = List.of(
            "quarkus.oidc.auth-server-url",
            "quarkus.oidc.client-id",
            "quarkus.oidc.credentials.secret",
            "quarkus.oidc.authentication.state-secret",
            "quarkus.oidc.token-state-manager.encryption-secret",
            "quarkus.http.proxy.trusted-proxies",
            "quarkus.http.host-validation.allowed-hosts");

    void validate(@Observes StartupEvent event) {
        Config config = ConfigProvider.getConfig();
        if (!config.getOptionalValue("quarkus.oidc.tenant-enabled", Boolean.class).orElse(true)) {
            return;
        }

        List<String> invalid = new ArrayList<>();
        for (String property : REQUIRED_PROPERTIES) {
            if (config.getOptionalValue(property, String.class).filter(value -> !value.isBlank()).isEmpty()) {
                invalid.add(property);
            }
        }
        if (!config.getOptionalValue("quarkus.http.proxy.proxy-address-forwarding", Boolean.class).orElse(false)) {
            invalid.add("quarkus.http.proxy.proxy-address-forwarding=true");
        }
        requireMinimumLength(config, "quarkus.oidc.authentication.state-secret", invalid);
        requireMinimumLength(config, "quarkus.oidc.token-state-manager.encryption-secret", invalid);

        if (!invalid.isEmpty()) {
            throw new ConfigurationException(
                    "OIDC is enabled but required runtime configuration is missing or invalid: "
                            + String.join(", ", invalid));
        }
    }

    private static void requireMinimumLength(Config config, String property, List<String> invalid) {
        config.getOptionalValue(property, String.class)
                .filter(value -> !value.isBlank() && value.length() < 32)
                .ifPresent(value -> invalid.add(property + " (must be at least 32 characters)"));
    }
}
