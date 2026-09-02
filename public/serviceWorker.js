let accessToken = "";
// Origin of the configured apiBaseUrl. Not every deployment is served from
// the default domain, so the app posts its runtime config origin here
// instead of us maintaining a hardcoded host list.
let apiOrigin = "";

// Keycloak/IdP origins never get the token attached.
const EXCLUDED_ORIGINS = [
  "https://iam.ideaconsult.net",
  "https://idp.ideaconsult.net",
];

function isApiOrigin(origin) {
  if (EXCLUDED_ORIGINS.includes(origin)) return false;
  if (origin === apiOrigin) return true;
  return origin.startsWith("https://") && origin.endsWith(".ideaconsult.net");
}

self.addEventListener("install", (event) => {
  console.log("SW installed, waiting for activation...");
});

self.addEventListener("activate", (event) => {
  console.log("SW activated");
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TOKEN") {
    accessToken = event.data.token;
    if (event.data.apiOrigin !== undefined) {
      apiOrigin = event.data.apiOrigin;
    }
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(event.request.url);

  if (
    accessToken &&
    isApiOrigin(url.origin) &&
    request.method === "GET" &&
    request.destination === "image" &&
    !request.headers.has("Authorization")
  ) {
    const authRequest = new Request(request, {
      headers: new Headers({
        ...request.headers,
        Authorization: `Bearer ${accessToken}`,
      }),
      mode: "cors",
    });
    event.respondWith(fetch(authRequest));
  }
});
