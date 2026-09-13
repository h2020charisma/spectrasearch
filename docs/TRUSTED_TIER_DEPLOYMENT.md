# Trusted-Tier Deployment

The normal SpectraSearch image supports two runtime modes. OIDC is disabled by
default, so the image starts anonymously without an issuer, client, proxy
configuration, or secret mount. An authenticated deployment explicitly enables
the default Quarkus OIDC tenant and supplies all deployment-specific values.

`quarkus.oidc.enabled` is a build-time extension switch in Quarkus 3.39.3 and is
therefore not the deployment toggle. The image keeps the extension installed and
uses the runtime `quarkus.oidc.tenant-enabled` property instead. No custom
Quarkus profile is involved; both modes run with the normal `prod` profile.

## Runtime Configuration

Set these non-secret environment variables for an authenticated deployment:

| Environment variable | Required value or meaning |
| --- | --- |
| `QUARKUS_OIDC_TENANT_ENABLED` | `true` |
| `QUARKUS_OIDC_AUTH_SERVER_URL` | Exact OIDC issuer URL |
| `QUARKUS_OIDC_CLIENT_ID` | Confidential client ID |
| `QUARKUS_CONFIG_LOCATIONS` | `file:/run/secrets/spectrasearch_oidc.properties` |
| `QUARKUS_HTTP_PROXY_PROXY_ADDRESS_FORWARDING` | `true` |
| `QUARKUS_HTTP_PROXY_TRUSTED_PROXIES` | Direct Traefik peer IP address or narrow container-network CIDR |
| `QUARKUS_HTTP_HOST_VALIDATION_ALLOWED_HOSTS` | Comma-separated external hostnames, without schemes or paths |

`SPECTRASEARCH_CONFIG_FILE` independently selects the packaged browser runtime
configuration. It is required only when the desired profile is not the default
`spectra.json`.

The application refuses to start an explicitly enabled tenant unless the issuer,
client ID, three secret properties, trusted proxies, allowed hosts, and proxy
address forwarding are present. The state and token-state encryption secrets
must each contain at least 32 characters. This prevents an enabled deployment
from silently behaving as a public client or using restart-unstable generated
keys.

Authorization Code, PKCE S256, nonce validation, encrypted stateless token state,
the five-second single-process refresh-result cache, secure cookie attributes,
CSRF behavior, scopes, callback paths, and logout paths are application policy.
They are intentionally not deployment knobs.

## Secret File

Mount one properties file at
`/run/secrets/spectrasearch_oidc.properties`:

```properties
quarkus.oidc.credentials.secret=<confidential-client-secret>
quarkus.oidc.authentication.state-secret=<stable-high-entropy-application-secret>
quarkus.oidc.token-state-manager.encryption-secret=<stable-high-entropy-application-secret>
```

The state and token-state properties may use the same independently generated,
stable application secret. Keep it stable across restarts so existing sessions
remain decryptable. Rotating it intentionally invalidates sessions and in-flight
login state.

Do not commit this file, place it in the Docker build context, or expose its
values through environment variables. Store the source under a private host
directory and mount it read-only. The runtime image runs as UID 1001. Linux
Docker Compose file-backed secrets can preserve source ownership and permissions,
so verify that UID 1001 can read the mounted target. A secret file owned by UID
1001 with mode `0400` inside a root-owned private directory, or an equivalently
protected deployment-specific ACL, is suitable. Do not weaken the enclosing
secrets directory merely to make the file readable.

Java properties syntax and SmallRye property-expression expansion both apply.
Escape special `.properties` characters, and write a literal `${...}` sequence
as `\\${...}` in the physical properties file so it is not expanded. Base64url
or hexadecimal application secrets avoid that ambiguity.

## Compose Example

The following is the required shape for `spectra-dev`. Determine the actual
Traefik container-network CIDR and supply it as `TRAEFIK_NETWORK_CIDR`; do not use
the public client range or `127.0.0.1`.

```yaml
services:
  dev:
    image: ghcr.io/h2020charisma/spectrasearch:pr-N
    environment:
      SPECTRASEARCH_CONFIG_FILE: plastic.json
      QUARKUS_OIDC_TENANT_ENABLED: "true"
      QUARKUS_OIDC_AUTH_SERVER_URL: https://id.adma.ai/realms/enm
      QUARKUS_OIDC_CLIENT_ID: spectrasearch-dev
      QUARKUS_CONFIG_LOCATIONS: file:/run/secrets/spectrasearch_oidc.properties
      QUARKUS_HTTP_PROXY_PROXY_ADDRESS_FORWARDING: "true"
      QUARKUS_HTTP_PROXY_TRUSTED_PROXIES: ${TRAEFIK_NETWORK_CIDR:?set the direct Traefik network CIDR}
      QUARKUS_HTTP_HOST_VALIDATION_ALLOWED_HOSTS: spectra-dev.adma.ai
    secrets:
      - source: spectrasearch_dev_oidc
        target: spectrasearch_oidc.properties

secrets:
  spectrasearch_dev_oidc:
    file: ./secrets/spectrasearch-dev-oidc.properties
```

Removing the OIDC and proxy variables plus the service secret mount returns the
same image to anonymous mode. No empty or placeholder secret file is needed.

## Trusted Proxy Boundary

Traefik must be the only practical network path to port 8080. Configure
`QUARKUS_HTTP_PROXY_TRUSTED_PROXIES` with the address or narrow CIDR from which
the container directly receives Traefik connections. Do not omit it when OIDC is
enabled: Quarkus otherwise trusts forwarding headers from every peer.

Traefik must strip external `/search/`, remove or overwrite client-supplied
`Forwarded` and `X-Forwarded-*` values, and provide authoritative values equivalent
to:

```text
X-Forwarded-Proto: https
X-Forwarded-Host: spectra-dev.adma.ai
X-Forwarded-Prefix: /search/
```

The application accepts `X-Forwarded-*` only; RFC 7239 `Forwarded` processing is
disabled. Trusted forwarding reconstructs the external URLs, so no separate
public-base-URL setting is required.

The existing `spectrasearch-dev` Keycloak registration uses these exact URLs:

```text
https://spectra-dev.adma.ai/search/api/auth/callback
https://spectra-dev.adma.ai/search/api/auth/logged-out
```

The second URL remains required while the experimental framework RP-logout path
is enabled. Its application-side initiation is a state-changing GET and is not an
accepted final endpoint design; compatibility evidence does not remove that
known concern.
