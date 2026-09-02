const authByClient = new Map();
const authRevisionByClient = new Map();
const pendingAuthByClient = new Map();
const AUTH_REQUEST_TIMEOUT_MS = 2000;

function normalizeAuth(data) {
  if (!data || typeof data.apiOrigin !== "string") return null;

  try {
    const apiUrl = new URL(data.apiOrigin);
    if (!["http:", "https:"].includes(apiUrl.protocol)) return null;

    const apiOrigin = apiUrl.origin;
    const token = typeof data.token === "string" ? data.token : "";

    return { apiOrigin, token };
  } catch {
    return null;
  }
}

function rememberClientAuth(clientId, data) {
  if (!clientId) return null;

  const auth = normalizeAuth(data);
  authRevisionByClient.set(
    clientId,
    (authRevisionByClient.get(clientId) || 0) + 1,
  );
  if (auth) {
    authByClient.set(clientId, auth);
  } else {
    authByClient.delete(clientId);
  }

  return auth;
}

self.addEventListener("install", () => {
  console.log("SW installed, waiting for activation...");
});

self.addEventListener("activate", () => {
  console.log("SW activated");
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "TOKEN") {
    rememberClientAuth(event.source?.id, event.data);
  }
});

function requestClientAuth(client) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;
    let timer;

    const finish = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.port1.close();
      resolve(data);
    };

    channel.port1.onmessage = (event) => {
      finish(event.data?.type === "TOKEN_RESPONSE" ? event.data : null);
    };
    channel.port1.onmessageerror = () => finish(null);
    channel.port1.start();
    timer = setTimeout(() => finish(null), AUTH_REQUEST_TIMEOUT_MS);

    try {
      client.postMessage({ type: "TOKEN_REQUEST" }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}

function getClientAuth(clientId) {
  if (!clientId) return Promise.resolve(null);

  const knownAuth = authByClient.get(clientId);
  if (knownAuth) return Promise.resolve(knownAuth);

  const pendingAuth = pendingAuthByClient.get(clientId);
  if (pendingAuth) return pendingAuth;

  // Worker globals are disposable, so recover auth from the requesting tab.
  const authRevision = authRevisionByClient.get(clientId) || 0;
  const authRequest = (async () => {
    const client = await self.clients.get(clientId);
    if (!client) return null;

    const response = await requestClientAuth(client);
    if ((authRevisionByClient.get(clientId) || 0) !== authRevision) {
      return authByClient.get(clientId) || null;
    }

    return rememberClientAuth(clientId, response);
  })().finally(() => {
    pendingAuthByClient.delete(clientId);
  });

  pendingAuthByClient.set(clientId, authRequest);
  return authRequest;
}

async function handleImageRequest(request, clientId) {
  try {
    const auth = await getClientAuth(clientId);
    if (!auth || new URL(request.url).origin !== auth.apiOrigin || !auth.token) {
      return fetch(request);
    }

    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${auth.token}`);

    return await fetch(
      new Request(request, {
        headers,
        mode: "cors",
      }),
    );
  } catch {
    return fetch(request);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (
    request.method === "GET" &&
    request.destination === "image" &&
    !request.headers.has("Authorization")
  ) {
    event.respondWith(handleImageRequest(request, event.clientId));
  }
});
