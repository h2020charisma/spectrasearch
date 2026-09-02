/* eslint-disable no-undef */

const testURLRoot = "http://127.0.0.1:50722/search/";
const testOrigin = new URL(testURLRoot).origin;
const apiBaseUrl = "http://localhost:50722/search/__cypress_api__/";
const apiOrigin = new URL(apiBaseUrl).origin;
const resetPageUrl = `${testOrigin}/__cypress_sw_reset__.html`;
const silentClientUrl = `${testURLRoot}__cypress_silent_client__.html`;
const accessToken = "cypress-image-token";
const secondaryAccessToken = "cypress-second-client-token";
const oidcStorageKey =
  "oidc.user:https://iam.ideaconsult.net/auth/realms/nano:idea-ui";
const corsHeaders = {
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "Authorization,Content-Type",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-origin": testOrigin,
};

function setAppIntercepts() {
  cy.intercept("GET", resetPageUrl, {
    body: "<!doctype html><title>Service worker reset</title>",
    headers: { "content-type": "text/html" },
  });
  cy.intercept("GET", `${silentClientUrl}*`, {
    body: `<!doctype html>
      <script>
        const params = new URLSearchParams(window.location.search);
        window.__tokenRequestCount = 0;
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type !== "TOKEN_REQUEST") return;
          window.__tokenRequestCount += 1;

          const auth = {
            token: params.get("token") || "",
            apiOrigin: params.get("apiOrigin") || "",
          };
          if (params.get("mode") === "respond") {
            event.ports[0]?.postMessage({ type: "TOKEN_RESPONSE", ...auth });
          } else if (params.get("mode") === "proactive") {
            navigator.serviceWorker.controller?.postMessage({
              type: "TOKEN",
              ...auth,
            });
          }
        });
      </script>`,
    headers: { "content-type": "text/html" },
  });
  cy.intercept("GET", `${testURLRoot}config.json`, {
    body: { apiBaseUrl },
  });
  cy.intercept("OPTIONS", `${apiBaseUrl}**`, {
    statusCode: 204,
    headers: corsHeaders,
  });
  cy.intercept("GET", `${apiBaseUrl}db/query/sources`, {
    fixture: "json/bk_rcapi_sources_generated.json",
    headers: corsHeaders,
  });
  cy.intercept("GET", new RegExp(`${apiBaseUrl}db/query\\?`), {
    body: { status: 0, numFound: 0, start: 0, response: [] },
    headers: corsHeaders,
  });
}

function seedOidcUser(win) {
  win.sessionStorage.setItem(
    oidcStorageKey,
    JSON.stringify({
      access_token: accessToken,
      token_type: "Bearer",
      scope: "openid profile email",
      profile: {
        sub: "cypress-service-worker-user",
        name: "Cypress service worker user",
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
}

function clearOidcUser(win) {
  win.sessionStorage.removeItem(oidcStorageKey);
}

function unregisterWorkers() {
  return cy.window().then(async (win) => {
    const registrations = await win.navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
  });
}

function openWithClaimedWorker(authenticated = true) {
  cy.visit(resetPageUrl);
  unregisterWorkers();

  cy.visit(testURLRoot, {
    onBeforeLoad(win) {
      win.__initialServiceWorkerController =
        win.navigator.serviceWorker.controller;
      win.__controllerChangeCount = 0;
      win.navigator.serviceWorker.addEventListener("controllerchange", () => {
        win.__controllerChangeCount += 1;
      });
      if (authenticated) {
        seedOidcUser(win);
      } else {
        clearOidcUser(win);
      }
    },
  });
  cy.window().should((win) => {
    expect(win.__initialServiceWorkerController).to.equal(null);
  });
  cy.window().then((win) => win.navigator.serviceWorker.ready);
  cy.window().should((win) => {
    expect(win.navigator.serviceWorker.controller).not.to.equal(null);
  });
  cy.window().its("__controllerChangeCount").should("be.greaterThan", 0);
  if (authenticated) {
    cy.contains(".userName", "Cypress service worker user").should(
      "be.visible",
    );
  }
}

function appendImageToDocument(document, url, testId) {
  return new Cypress.Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.dataset.cy = testId;
    image.onload = () => {
      expect(image.complete).to.equal(true);
      expect(image.naturalWidth).to.be.greaterThan(0);
      resolve();
    };
    image.onerror = () => reject(new Error(`Image failed to load: ${url}`));
    image.src = url;
    document.body.appendChild(image);
  });
}

function appendImage(url, testId) {
  return cy
    .document()
    .then((document) => appendImageToDocument(document, url, testId));
}

function createControlledClient(mode, token = "") {
  const url = new URL(silentClientUrl);
  url.searchParams.set("mode", mode);
  url.searchParams.set("apiOrigin", apiOrigin);
  url.searchParams.set("token", token);

  return cy.document().then(
    (document) =>
      new Cypress.Promise((resolve, reject) => {
        const iframe = document.createElement("iframe");
        iframe.onload = () => {
          const frameWindow = iframe.contentWindow;
          if (!frameWindow.navigator.serviceWorker.controller) {
            reject(new Error("The secondary client is not controlled"));
            return;
          }
          resolve({
            document: iframe.contentDocument,
            window: frameWindow,
          });
        };
        iframe.onerror = () => reject(new Error("Secondary client failed"));
        iframe.src = url.href;
        document.body.appendChild(iframe);
      }),
  );
}

const restartIt = Cypress.browser.family === "chromium" ? it : it.skip;

describe("Service worker image authorization", () => {
  beforeEach(() => {
    setAppIntercepts();
  });

  afterEach(() => {
    unregisterWorkers();
  });

  it("claims the first page and authorizes only the configured API origin", () => {
    openWithClaimedWorker();

    const apiImageUrl = `${apiBaseUrl}image/authorized.png`;
    const unrelatedImageUrl =
      "https://unconfigured.ideaconsult.net/image.png";

    cy.intercept("GET", apiImageUrl, {
      fixture: "images/blank.png",
      headers: { ...corsHeaders, "content-type": "image/png" },
    }).as("apiImage");
    cy.intercept("OPTIONS", apiImageUrl, {
      statusCode: 204,
      headers: corsHeaders,
    }).as("apiImagePreflight");
    cy.intercept("GET", unrelatedImageUrl, {
      fixture: "images/blank.png",
      headers: { "content-type": "image/png" },
    }).as("unrelatedImage");

    appendImage(apiImageUrl, "api-image");
    appendImage(unrelatedImageUrl, "unrelated-image");

    cy.wait("@apiImagePreflight")
      .its("request.headers.access-control-request-headers")
      .should("contain", "authorization");
    cy.wait("@apiImage").then(({ request }) => {
      expect(request.headers.authorization).to.equal(`Bearer ${accessToken}`);
      expect(request.headers.accept).to.contain("image/");
    });
    cy.wait("@unrelatedImage")
      .its("request.headers")
      .should("not.have.property", "authorization");
  });

  restartIt("isolates client auth after the worker is restarted", () => {
    openWithClaimedWorker();

    const warmupImageUrl = `${apiBaseUrl}image/warmup.png`;
    cy.intercept("GET", warmupImageUrl, {
      fixture: "images/blank.png",
      headers: { ...corsHeaders, "content-type": "image/png" },
    }).as("warmupImage");

    appendImage(warmupImageUrl, "warmup-image");
    cy.wait("@warmupImage")
      .its("request.headers.authorization")
      .should("equal", `Bearer ${accessToken}`);

    cy.window().then((win) => {
      win.__tokenRequestCount = 0;
      win.navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "TOKEN_REQUEST") {
          win.__tokenRequestCount += 1;
        }
      });
    });

    let secondaryClient;
    createControlledClient("respond", secondaryAccessToken).then((client) => {
      secondaryClient = client;
    });

    const imageUrl = `${apiBaseUrl}image/restarted-top.png`;
    const secondaryImageUrl = `${apiBaseUrl}image/restarted-secondary.png`;
    cy.intercept("GET", imageUrl, {
      fixture: "images/blank.png",
      headers: { ...corsHeaders, "content-type": "image/png" },
    }).as("restartedImage");
    cy.intercept("GET", secondaryImageUrl, {
      fixture: "images/blank.png",
      headers: { ...corsHeaders, "content-type": "image/png" },
    }).as("secondaryImage");

    cy.window().then((win) => win.navigator.serviceWorker.ready);
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "ServiceWorker.stopAllWorkers",
        params: {},
      }),
    );

    appendImage(imageUrl, "restarted-image");
    cy.then(() =>
      appendImageToDocument(
        secondaryClient.document,
        secondaryImageUrl,
        "secondary-image",
      ),
    );

    cy.wait("@restartedImage")
      .its("request.headers.authorization")
      .should("equal", `Bearer ${accessToken}`);
    cy.wait("@secondaryImage")
      .its("request.headers.authorization")
      .should("equal", `Bearer ${secondaryAccessToken}`);
    cy.get("@restartedImage.all").should("have.length", 1);
    cy.window().its("__tokenRequestCount").should("be.greaterThan", 0);
    cy.then(() => {
      expect(secondaryClient.window.__tokenRequestCount).to.be.greaterThan(0);
    });
  });

  it("keeps API images anonymous when the user has no token", () => {
    openWithClaimedWorker(false);

    const imageUrl = `${apiBaseUrl}image/public.png`;
    cy.intercept("GET", imageUrl, {
      fixture: "images/blank.png",
      headers: { "content-type": "image/png" },
    }).as("publicImage");

    appendImage(imageUrl, "public-image");

    cy.wait("@publicImage")
      .its("request.headers")
      .should("not.have.property", "authorization");
  });

  it(
    "falls back anonymously when a controlled client does not reply",
    { defaultCommandTimeout: 7000 },
    () => {
      openWithClaimedWorker();

      let silentClient;
      createControlledClient("none").then((client) => {
        silentClient = client;
      });

      const imageUrl = `${apiBaseUrl}image/no-reply.png`;
      cy.intercept("GET", imageUrl, {
        fixture: "images/blank.png",
        headers: { "content-type": "image/png" },
      }).as("noReplyImage");

      let startedAt;
      cy.then(() => {
        startedAt = Date.now();
        return appendImageToDocument(
          silentClient.document,
          imageUrl,
          "no-reply-image",
        );
      });

      cy.wait("@noReplyImage")
        .its("request.headers")
        .should("not.have.property", "authorization");
      cy.then(() => {
        const elapsed = Date.now() - startedAt;
        expect(elapsed).to.be.greaterThan(1500);
        expect(elapsed).to.be.lessThan(6000);
        expect(silentClient.window.__tokenRequestCount).to.be.greaterThan(0);
      });
    },
  );

  it("uses proactive auth without waiting for recovery to time out", () => {
    openWithClaimedWorker();

    let proactiveClient;
    createControlledClient("proactive", secondaryAccessToken).then((client) => {
      proactiveClient = client;
    });

    const imageUrl = `${apiBaseUrl}image/proactive.png`;
    cy.intercept("GET", imageUrl, {
      fixture: "images/blank.png",
      headers: { ...corsHeaders, "content-type": "image/png" },
    }).as("proactiveImage");

    let startedAt;
    cy.then(() => {
      startedAt = Date.now();
      return appendImageToDocument(
        proactiveClient.document,
        imageUrl,
        "proactive-image",
      );
    });

    cy.wait("@proactiveImage")
      .its("request.headers.authorization")
      .should("equal", `Bearer ${secondaryAccessToken}`);
    cy.then(() => {
      expect(Date.now() - startedAt).to.be.lessThan(1500);
      expect(proactiveClient.window.__tokenRequestCount).to.be.greaterThan(0);
    });
  });
});
