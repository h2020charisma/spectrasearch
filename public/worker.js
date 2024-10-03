let accessToken = null;

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
  console.log("ENM service worker activated");
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_TOKEN") {
    accessToken = event.data.token;
    console.log("Access token received by Service Worker:", accessToken);
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (
    request.method === "GET" &&
    accessToken &&
    request.destination === "image"
  ) {
    const authRequest = new Request(request, {
      headers: new Headers({
        ...request.headers,
        Authorization: `Bearer ${accessToken}`,
      }),
      mode: "cors",
    });
    event.respondWith(fetch(authRequest));
  } else {
    event.respondWith(fetch(request));
  }
});
