let accessToken = "";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("Service Worker is installed");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("ServiceWorker.js activated");
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TOKEN") {
    accessToken = event.data.token;
    console.log(
      "Message Event: token received by Service Worker:",
      accessToken
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(event.request.url);

  if (
    accessToken &&
    url.origin.startsWith("https://") &&
    url.origin.endsWith(".ideaconsult.net") &&
    request.method === "GET" &&
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
    // event.respondWith(fetch(request));
    console.log("without token");
  }
});
