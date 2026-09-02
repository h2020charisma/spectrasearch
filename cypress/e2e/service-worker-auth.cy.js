/* eslint-disable no-undef */

const testURLRoot = "http://127.0.0.1:50722/search/";
const testOrigin = new URL(testURLRoot).origin;
const apiBaseUrl = "http://localhost:50722/search/__cypress_api__/";
const accessToken = "cypress-image-token";
const oidcStorageKey =
  "oidc.user:https://iam.ideaconsult.net/auth/realms/nano:idea-ui";
const corsHeaders = {
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "Authorization,Content-Type",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-origin": testOrigin,
};

function setAppIntercepts() {
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

function unregisterWorkers() {
  return cy.window().then(async (win) => {
    const registrations = await win.navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
  });
}

function openWithControllingWorker() {
  cy.visit(testURLRoot, { onBeforeLoad: seedOidcUser });
  cy.contains(".userName", "Cypress service worker user").should("be.visible");
  cy.window().then((win) => win.navigator.serviceWorker.ready);
  unregisterWorkers();

  // Install a fresh worker, then reload once more so it controls the page.
  cy.reload();
  cy.window().then((win) => win.navigator.serviceWorker.ready);
  cy.reload();
  cy.window().should((win) => {
    expect(win.navigator.serviceWorker.controller).not.to.equal(null);
  });
  cy.contains(".userName", "Cypress service worker user").should("be.visible");
}

function appendImage(url, testId) {
  return cy.document().then(
    (document) =>
      new Cypress.Promise((resolve, reject) => {
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
      }),
  );
}

const restartIt = Cypress.browser.family === "chromium" ? it : it.skip;

describe("Service worker image authorization", () => {
  beforeEach(() => {
    setAppIntercepts();
    openWithControllingWorker();
  });

  afterEach(() => {
    unregisterWorkers();
  });

  it("authorizes only images on the configured API origin", () => {
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

  restartIt("reacquires authorization after the worker is restarted", () => {
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

    const imageUrl = `${apiBaseUrl}image/restarted.png`;
    cy.intercept("GET", imageUrl, {
      fixture: "images/blank.png",
      headers: { ...corsHeaders, "content-type": "image/png" },
    }).as("restartedImage");

    cy.window().then((win) => win.navigator.serviceWorker.ready);
    cy.then(() =>
      Cypress.automation("remote:debugger:protocol", {
        command: "ServiceWorker.stopAllWorkers",
        params: {},
      }),
    );

    appendImage(imageUrl, "restarted-image");

    cy.wait("@restartedImage")
      .its("request.headers.authorization")
      .should("equal", `Bearer ${accessToken}`);
    cy.get("@restartedImage.all").should("have.length", 1);
    cy.window().its("__tokenRequestCount").should("be.greaterThan", 0);
  });
});
