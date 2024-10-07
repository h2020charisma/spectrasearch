let accessToken = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
  console.log("Service worker activated");
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_TOKEN") {
    accessToken = event.data.token;
    console.log("Access token received by Service Worker:", accessToken);
  }
});

function isGeneratedImage(url) {
  return url.pathname == "/download";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(event.request.url);
  console.log("fetch", url);
  console.log("fetch. Token:", accessToken);
  console.log(
    "conditions:",
    url.origin.startsWith("https://"),
    url.origin.endsWith(".ideaconsult.net"),
    request.method === "GET",
    isGeneratedImage(url),
    url.origin !== "https://iam.ideaconsult.net",
    url.origin !== "https://idp.ideaconsult.net",
    request.destination === "image",
    event.request.headers["Authorization"] == undefined
  );

  if (
    accessToken &&
    url.origin.startsWith("https://") &&
    url.origin.endsWith(".ideaconsult.net") &&
    request.method === "GET" &&
    // isGeneratedImage(url) &&
    url.origin !== "https://iam.ideaconsult.net" &&
    url.origin !== "https://idp.ideaconsult.net" &&
    request.destination === "image" &&
    event.request.headers["Authorization"] == undefined
  ) {
    const authRequest = new Request(request, {
      headers: new Headers({
        ...request.headers,
        Authorization: `Bearer ${accessToken}`,
      }),
      mode: "cors",
    });
    event.respondWith(fetch(authRequest));
    console.log("with token");
  } else {
    event.respondWith(fetch(request));
    console.log("without token");
  }
});
