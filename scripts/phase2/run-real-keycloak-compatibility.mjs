import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { serializeProperties } from "./serialize-properties.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runMode = process.argv[2] ?? "full";
assert.ok(new Set(["full", "smoke"]).has(runMode), "Usage: run-real-keycloak-compatibility.mjs [full|smoke]");
const runId = `${Date.now()}-${process.pid}`;
const temporaryDirectory = path.join(os.tmpdir(), `spectrasearch-phase2c-${runId}`);
const certificatePath = path.join(temporaryDirectory, "phase2c.crt");
const privateKeyPath = path.join(temporaryDirectory, "phase2c.key");
const oidcSecretConfigPath = path.join(temporaryDirectory, "spectrasearch_oidc.properties");
const reportDirectory = path.join(root, "phase2-results");
const reportPath = path.join(reportDirectory, `real-keycloak-${runMode}-${runId}.json`);

const issuer = "https://id.adma.ai/realms/enm";
const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
const clientId = "spectrasearch-dev";
const username = requiredEnvironment("PHASE2C_KEYCLOAK_USERNAME");
const clientSecretPath = requiredEnvironment("PHASE2C_KEYCLOAK_CLIENT_SECRET_FILE");
const testPasswordPath = requiredEnvironment("PHASE2C_KEYCLOAK_TEST_PASSWORD_FILE");
const ports = { app: 50722, quarkus: 50723 };
const appBase = `https://127.0.0.1:${ports.app}/search/`;
const callbackUrl = `${appBase}api/auth/callback`;
const postLogoutUrl = `${appBase}api/auth/logged-out`;
const keycloakOrigin = new URL(issuer).origin;

const secrets = {
  clientSecret: "",
  testPassword: "",
  encryptionSecret: randomBytes(32).toString("hex"),
  stateSecret: randomBytes(32).toString("hex"),
};

const report = {
  phase: runMode === "smoke" ? "2C-runtime-smoke" : "2C",
  runId,
  startedAt: new Date().toISOString(),
  source: {},
  provider: { issuer, clientId, username },
  registeredUrls: { callback: callbackUrl, postLogout: postLogoutUrl },
  checks: {},
  measurements: {},
  observations: {},
};

const applicationRequests = [];
const providerRequests = [];
const blockedOrigins = new Set();
const quarkusLogs = [];
let appProxy;
let quarkusProcess;
let browser;
let discovery;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function redact(value) {
  let redacted = String(value);
  for (const secret of Object.values(secrets)) {
    if (secret) redacted = redacted.replaceAll(secret, "[REDACTED]");
  }
  return redacted
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/([?&](?:code|state|nonce|code_challenge|id_token_hint)=)[^&\s]+/g, "$1[REDACTED]")
    .replace(/((?:q_session(?:_[^=;\s]*)?|q_auth_[^=;\s]*|q_post_logout|csrf-token)=)[^;\s]+/g,
      "$1[REDACTED_COOKIE]");
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0 || options.allowFailure) resolve({ code, stdout, stderr });
      else reject(new Error(`${command} failed with exit code ${code}: ${redact(stderr || stdout)}`));
    });
  });
}

async function loadSecret(filePath) {
  const metadata = await stat(filePath);
  assert.equal(metadata.isFile(), true, `${filePath} must be a regular file`);
  assert.equal(metadata.mode & 0o777, 0o600, `${filePath} must have mode 0600`);
  if (process.getuid) assert.equal(metadata.uid, process.getuid(), `${filePath} must be owned by the current user`);
  const value = (await readFile(filePath, "utf8")).replace(/\r?\n$/, "");
  assert.ok(value.length > 0, `${filePath} is empty`);
  assert.equal(/[\r\n\0]/.test(value), false, `${filePath} contains an unexpected line break`);
  return value;
}

async function captureSource() {
  const head = (await run("git", ["rev-parse", "HEAD"])).stdout.trim();
  const branch = (await run("git", ["branch", "--show-current"])).stdout.trim();
  const originMain = (await run("git", ["rev-parse", "origin/main"])).stdout.trim();
  const status = (await run("git", ["status", "--porcelain=v1", "--untracked-files=all"])).stdout
    .split("\n").filter(Boolean);
  const sourcePaths = (await run("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]))
    .stdout.split("\0").filter(Boolean);
  return {
    head,
    branch,
    originMain,
    worktreeChanges: status,
    sourceTreeSha256: await fileTreeFingerprint(sourcePaths),
    quarkusArtifactSha256: await fileTreeFingerprint(await directoryFiles("target/quarkus-app")),
  };
}

async function fileTreeFingerprint(paths) {
  const hash = createHash("sha256");
  for (const relativePath of [...paths].sort()) {
    const content = await readFile(path.join(root, relativePath));
    hash.update(`${relativePath}\0${content.length}\0`);
    hash.update(content);
  }
  return hash.digest("hex");
}

async function directoryFiles(relativeDirectory) {
  const files = [];
  async function visit(relativePath) {
    for (const entry of await readdir(path.join(root, relativePath), { withFileTypes: true })) {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) files.push(child);
    }
  }
  await visit(relativeDirectory);
  return files;
}

async function assertPortsFree() {
  for (const port of Object.values(ports)) {
    await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", () => reject(new Error(`Required loopback port ${port} is already in use`)));
      server.listen(port, "127.0.0.1", () => server.close(resolve));
    });
  }
}

async function fetchJson(url, label) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `${label} returned HTTP ${response.status}`);
  return response.json();
}

async function inspectDiscovery() {
  discovery = await fetchJson(discoveryUrl, "OIDC discovery");
  assert.equal(discovery.issuer, issuer);
  for (const property of ["authorization_endpoint", "token_endpoint", "jwks_uri", "end_session_endpoint"]) {
    assert.ok(discovery[property], `OIDC discovery omitted ${property}`);
    assert.equal(new URL(discovery[property]).protocol, "https:");
    assert.equal(new URL(discovery[property]).origin, keycloakOrigin);
  }
  assert.ok(discovery.token_endpoint_auth_methods_supported?.includes("client_secret_basic"));
  assert.ok(discovery.code_challenge_methods_supported?.includes("S256"));
  const jwks = await fetchJson(discovery.jwks_uri, "OIDC JWKS");
  assert.ok(Array.isArray(jwks.keys) && jwks.keys.length > 0, "OIDC JWKS is empty");
  report.provider.discovery = {
    issuer: discovery.issuer,
    authorizationEndpoint: discovery.authorization_endpoint,
    tokenEndpoint: discovery.token_endpoint,
    jwksUri: discovery.jwks_uri,
    endSessionEndpoint: discovery.end_session_endpoint,
    clientSecretBasicAdvertised: true,
    pkceS256Advertised: true,
    responseCodeAdvertised: discovery.response_types_supported?.includes("code") ?? false,
    idTokenSigningAlgorithms: discovery.id_token_signing_alg_values_supported ?? [],
    jwksKeyCount: jwks.keys.length,
    jwksAlgorithms: [...new Set(jwks.keys.map(({ alg }) => alg).filter(Boolean))].sort(),
  };
  report.checks.discovery = "pass";
  report.checks.jwks = "pass";
}

async function createCertificate() {
  await run("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", privateKeyPath,
    "-out", certificatePath,
    "-days", "1",
    "-subj", "/CN=127.0.0.1",
    "-addext", "subjectAltName=IP:127.0.0.1",
  ]);
  return { key: await readFile(privateKeyPath), cert: await readFile(certificatePath) };
}

function cookieNames(header) {
  return String(header ?? "").split(";").map((part) => part.trim().split("=", 1)[0]).filter(Boolean).sort();
}

function startApplicationProxy(tls) {
  appProxy = https.createServer(tls, (request, response) => {
    const requested = new URL(request.url, appBase);
    if (requested.pathname === "/search") {
      response.writeHead(301, { location: `/search/${requested.search}` });
      response.end();
      return;
    }
    if (!requested.pathname.startsWith("/search/")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    applicationRequests.push({
      method: request.method,
      path: requested.pathname,
      queryNames: [...new Set(requested.searchParams.keys())].sort(),
      cookieBytes: Buffer.byteLength(request.headers.cookie ?? "", "utf8"),
      cookieNames: cookieNames(request.headers.cookie),
      requestHeaderBytes: request.rawHeaders.reduce(
        (total, value) => total + Buffer.byteLength(value, "utf8") + 2, 2,
      ),
    });

    const requestHeaders = { ...request.headers };
    for (const name of Object.keys(requestHeaders)) {
      if (name === "forwarded" || name.startsWith("x-forwarded-")) delete requestHeaders[name];
    }
    delete requestHeaders.connection;
    delete requestHeaders["content-length"];
    requestHeaders.host = `127.0.0.1:${ports.quarkus}`;
    requestHeaders["x-forwarded-host"] = `127.0.0.1:${ports.app}`;
    requestHeaders["x-forwarded-prefix"] = "/search/";
    requestHeaders["x-forwarded-proto"] = "https";

    const upstream = http.request({
      host: "127.0.0.1",
      port: ports.quarkus,
      method: request.method,
      path: `/${requested.pathname.slice("/search/".length)}${requested.search}`,
      headers: requestHeaders,
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.on("error", (error) => {
      if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain" });
      response.end("Quarkus unavailable");
      report.observations.proxyError = redact(error.message);
    });
    request.pipe(upstream);
  });
  return new Promise((resolve, reject) => {
    appProxy.once("error", reject);
    appProxy.listen(ports.app, "127.0.0.1", resolve);
  });
}

async function waitForHealth(timeout = 30_000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${ports.quarkus}/health`);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for Quarkus: ${lastError?.message ?? "no response"}`);
}

async function startQuarkus() {
  await writeFile(oidcSecretConfigPath, serializeProperties({
    "quarkus.oidc.credentials.secret": secrets.clientSecret,
    "quarkus.oidc.authentication.state-secret": secrets.stateSecret,
    "quarkus.oidc.token-state-manager.encryption-secret": secrets.encryptionSecret,
  }), { mode: 0o600 });
  assert.equal((await stat(oidcSecretConfigPath)).mode & 0o777, 0o600);
  const jar = path.join(root, "target/quarkus-app/quarkus-run.jar");
  const environment = { ...process.env };
  for (const name of [
    "QUARKUS_OIDC_AUTHENTICATION_STATE_SECRET",
    "QUARKUS_OIDC_CREDENTIALS_SECRET",
    "QUARKUS_OIDC_TOKEN_STATE_MANAGER_ENCRYPTION_SECRET",
  ]) delete environment[name];
  Object.assign(environment, {
    QUARKUS_CONFIG_LOCATIONS: pathToFileURL(oidcSecretConfigPath).href,
    QUARKUS_HTTP_AUTH_PERMISSION_AUTH_DIAGNOSTICS_POLICY: "authenticated",
    QUARKUS_HTTP_HOST_VALIDATION_ALLOWED_HOSTS: "127.0.0.1",
    QUARKUS_HTTP_PROXY_PROXY_ADDRESS_FORWARDING: "true",
    QUARKUS_HTTP_PROXY_TRUSTED_PROXIES: "127.0.0.1",
    QUARKUS_OIDC_AUTH_SERVER_URL: issuer,
    QUARKUS_OIDC_CLIENT_ID: clientId,
    QUARKUS_OIDC_TENANT_ENABLED: "true",
    QUARKUS_PROFILE: "prod",
  });
  quarkusProcess = spawn("java", [
    "-Dquarkus.http.host=127.0.0.1",
    `-Dquarkus.http.port=${ports.quarkus}`,
    "-jar", jar,
  ], {
    cwd: root,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  quarkusProcess.stdout.on("data", (chunk) => quarkusLogs.push(chunk.toString("utf8")));
  quarkusProcess.stderr.on("data", (chunk) => quarkusLogs.push(chunk.toString("utf8")));
  try {
    await waitForHealth();
    assert.match(quarkusLogs.join(""), /Profile prod activated\./);
  } catch (error) {
    throw new Error(`${error.message}; logs=${redact(quarkusLogs.join(""))}`);
  }
}

async function stopQuarkus() {
  if (!quarkusProcess) return;
  const child = quarkusProcess;
  quarkusProcess = undefined;
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      delay(10_000).then(() => child.kill("SIGKILL")),
    ]);
  }
}

function safeRequest(url, method) {
  const parsed = new URL(url);
  return {
    method,
    origin: parsed.origin,
    path: parsed.pathname,
    queryNames: [...new Set(parsed.searchParams.keys())].sort(),
  };
}

function observePage(page) {
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === keycloakOrigin) {
      providerRequests.push(safeRequest(request.url(), request.method()));
      if (url.href.startsWith(discovery.authorization_endpoint)) {
        const scope = (url.searchParams.get("scope") ?? "").split(/\s+/).filter(Boolean).sort();
        report.observations.authorizationRequest = {
          clientIdMatches: url.searchParams.get("client_id") === clientId,
          redirectUri: url.searchParams.get("redirect_uri"),
          responseType: url.searchParams.get("response_type"),
          responseMode: url.searchParams.get("response_mode"),
          scopes: scope,
          statePresent: Boolean(url.searchParams.get("state")),
          stateBytes: Buffer.byteLength(url.searchParams.get("state") ?? "", "utf8"),
          noncePresent: Boolean(url.searchParams.get("nonce")),
          nonceBytes: Buffer.byteLength(url.searchParams.get("nonce") ?? "", "utf8"),
          codeChallengeMethod: url.searchParams.get("code_challenge_method"),
          codeChallengeBytes: Buffer.byteLength(url.searchParams.get("code_challenge") ?? "", "utf8"),
        };
      }
    }
  });
}

async function installNetworkBoundary(context, { allowKeycloak }) {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const allowed = url.origin === new URL(appBase).origin
      || (allowKeycloak && url.origin === keycloakOrigin)
      || new Set(["data:", "blob:", "about:"]).has(url.protocol);
    if (allowed) await route.continue();
    else {
      blockedOrigins.add(url.origin);
      await route.abort("blockedbyclient");
    }
  });
}

async function fetchSession(page) {
  return page.evaluate(async () => {
    const response = await fetch("/search/api/auth/session", {
      credentials: "same-origin",
      headers: { "X-Requested-With": "JavaScript" },
    });
    return { status: response.status, body: await response.json() };
  });
}

async function fetchDiagnostics(page) {
  return page.evaluate(async () => {
    const response = await fetch("/search/api/auth/diagnostics", {
      credentials: "same-origin",
      headers: { "X-Requested-With": "JavaScript" },
    });
    return { status: response.status, body: await response.json() };
  });
}

async function anonymousChecks() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await installNetworkBoundary(context, { allowKeycloak: false });
  const page = await context.newPage();
  observePage(page);
  const shell = await page.goto(appBase, { waitUntil: "domcontentloaded" });
  assert.equal(shell.status(), 200);
  assert.equal(page.url(), appBase);
  assert.equal(providerRequests.length, 0, "Anonymous shell contacted Keycloak");

  const probe = await page.goto(`${appBase}auth-probe.html`);
  assert.equal(probe.status(), 200);
  await page.locator(".status-anonymous").waitFor({ timeout: 15_000 });
  assert.deepEqual(await fetchSession(page), { status: 200, body: { authenticated: false } });
  const cookies = await context.cookies(`${appBase}auth-probe.html`);
  assert.ok(!cookies.some(({ name }) => name.startsWith("q_session")));
  await context.close();
  report.observations.anonymous = {
    shellStatus: 200,
    session: { authenticated: false },
    keycloakRequestsBeforeOptInLogin: 0,
    blockedNonKeycloakExternalOrigins: [...blockedOrigins].sort(),
  };
  report.checks.anonymous = "pass";
}

async function login(context, { requireCredentials = false } = {}) {
  const page = await context.newPage();
  observePage(page);
  await page.goto(`${appBase}api/auth/login`, { waitUntil: "domcontentloaded" });
  const atProvider = new URL(page.url()).origin === keycloakOrigin;
  if (requireCredentials) assert.equal(atProvider, true, "Initial login did not reach the Keycloak login form");
  if (atProvider) {
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(secrets.testPassword);
    await Promise.all([
      page.waitForURL(`${appBase}auth-probe.html`, { timeout: 45_000 }),
      page.locator("#kc-login").click(),
    ]);
  } else {
    await page.waitForURL(`${appBase}auth-probe.html`, { timeout: 45_000 });
  }
  await page.locator(".status-authenticated").waitFor({ timeout: 15_000 });
  return page;
}

function measuredCookies(cookies) {
  return cookies.map((cookie) => ({
    name: cookie.name,
    valueBytes: Buffer.byteLength(cookie.value, "utf8"),
    nameAndValueBytes: Buffer.byteLength(cookie.name, "utf8") + Buffer.byteLength(cookie.value, "utf8"),
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
  }));
}

function materialClaims(claims) {
  return claims.map(({ name, type, cardinality, nestedValues, jsonBytes }) => ({
    name, type, cardinality, nestedValues, jsonBytes,
  })).sort((left, right) => right.jsonBytes - left.jsonBytes || left.name.localeCompare(right.name));
}

async function measureSession(context, page, label) {
  const diagnostics = await fetchDiagnostics(page);
  assert.equal(diagnostics.status, 200);
  assert.ok(diagnostics.body.accessTokenBytes > 0);
  assert.ok(diagnostics.body.idTokenBytes > 0);
  assert.ok(diagnostics.body.refreshTokenBytes > 0);
  assert.ok(diagnostics.body.accessTokenExpiresAt > diagnostics.body.accessTokenIssuedAt);

  const cookies = await context.cookies(`${appBase}auth-probe.html`);
  const measured = measuredCookies(cookies);
  const sessionCookies = measured.filter(({ name }) => name.startsWith("q_session"));
  assert.ok(sessionCookies.length >= 1);
  for (const cookie of sessionCookies) {
    assert.equal(cookie.secure, true);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "Lax");
    assert.equal(cookie.path, "/search/");
    assert.ok(cookie.nameAndValueBytes <= 4_096);
  }

  const relevantRequests = applicationRequests.filter(({ path }) => path.startsWith("/search/api/auth/"));
  const largestCookieHeaderBytes = Math.max(...relevantRequests.map(({ cookieBytes }) => cookieBytes), 0);
  const largestRequestHeaderBytes = Math.max(...relevantRequests.map(({ requestHeaderBytes }) => requestHeaderBytes), 0);
  report.measurements[label] = {
    tokens: {
      accessTokenBytes: diagnostics.body.accessTokenBytes,
      idTokenBytes: diagnostics.body.idTokenBytes,
      refreshTokenBytes: diagnostics.body.refreshTokenBytes,
      accessTokenLifetimeSeconds: diagnostics.body.accessTokenExpiresAt - diagnostics.body.accessTokenIssuedAt,
    },
    accessTokenClaims: materialClaims(diagnostics.body.accessTokenClaims),
    idTokenClaims: materialClaims(diagnostics.body.idTokenClaims),
    cookies: measured,
    sessionCookieCount: sessionCookies.length,
    sessionCookieValueBytes: sessionCookies.map(({ valueBytes }) => valueBytes),
    largestCookieHeaderBytes,
    largestRequestHeaderBytes,
    quarkusHeaderBytesRemaining: 20_480 - largestRequestHeaderBytes,
    phase2ANearWorstCase: {
      accessTokenBytes: 2_594,
      idTokenBytes: 1_167,
      sessionCookieValueBytes: [4_056, 2_192],
      largestCookieHeaderBytes: 6_321,
      largestRequestHeaderBytes: 6_943,
    },
  };
  const sessionState = cookies.filter(({ name }) => name.startsWith("q_session"))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map(({ value }) => value).join("");
  return { diagnostics: diagnostics.body, sessionState };
}

async function browserLeakCheck(context, page) {
  const state = await page.evaluate(async () => ({
    session: await (await fetch("/search/api/auth/session", {
      credentials: "same-origin",
      headers: { "X-Requested-With": "JavaScript" },
    })).json(),
    readableCookieNames: document.cookie.split(";").map((part) => part.trim().split("=", 1)[0]).filter(Boolean),
    readableCookiesContainJwt: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(document.cookie),
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage),
    indexedDatabaseCount: indexedDB.databases ? (await indexedDB.databases()).length : 0,
    cacheCount: "caches" in window ? (await caches.keys()).length : 0,
    serviceWorkerCount: "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
  }));
  assert.deepEqual(Object.keys(state.session).sort(), ["authenticated", "name"]);
  assert.equal(state.session.authenticated, true);
  assert.equal(state.session.name, username);
  assert.ok(!state.readableCookieNames.some((name) => name.startsWith("q_session")));
  assert.equal(state.readableCookiesContainJwt, false);
  assert.deepEqual(state.localStorageKeys, []);
  assert.deepEqual(state.sessionStorageKeys, []);
  assert.equal(state.indexedDatabaseCount, 0);
  assert.equal(state.cacheCount, 0);
  assert.equal(state.serviceWorkerCount, 0);
  const appCookies = await context.cookies(`${appBase}auth-probe.html`);
  assert.ok(appCookies.filter(({ name }) => name.startsWith("q_session")).every(({ httpOnly }) => httpOnly));
  report.observations.browserLeakCheck = state;
  report.checks.browserLeakage = "pass";
}

async function waitUntilExpired(diagnostics) {
  const waitMilliseconds = diagnostics.accessTokenExpiresAt * 1_000 - Date.now() + 1_500;
  assert.ok(waitMilliseconds > 0 && waitMilliseconds < 420_000, `Unexpected refresh wait ${waitMilliseconds}ms`);
  await delay(waitMilliseconds);
}

async function refreshChecks(context, page, initial) {
  await waitUntilExpired(initial.diagnostics);
  const first = await measureSession(context, page, "afterFirstRefresh");
  assert.ok(first.diagnostics.accessTokenIssuedAt > initial.diagnostics.accessTokenIssuedAt);
  assert.equal((await fetchSession(page)).body?.authenticated, true);

  if (runMode === "smoke") {
    assert.notEqual(first.sessionState, initial.sessionState);
    report.observations.refresh = {
      sequentialRefreshCycles: 1,
      firstCycleAuthenticated: true,
      sessionCiphertextChanged: true,
      processLocalRefreshCache: "5S",
    };
    report.checks.refresh = "pass";
    return;
  }

  const secondPage = await context.newPage();
  observePage(secondPage);
  await secondPage.goto(`${appBase}auth-probe.html`);
  await secondPage.locator(".status-authenticated").waitFor();
  await waitUntilExpired(first.diagnostics);
  const parallel = await Promise.all([
    fetchSession(page),
    fetchSession(secondPage),
    fetchSession(page),
    fetchSession(secondPage),
  ]);
  assert.ok(parallel.every(({ status, body }) => status === 200 && body?.authenticated));
  const second = await measureSession(context, page, "afterSecondRefresh");
  assert.ok(second.diagnostics.accessTokenIssuedAt > first.diagnostics.accessTokenIssuedAt);
  assert.notEqual(first.sessionState, initial.sessionState);
  assert.notEqual(second.sessionState, first.sessionState);
  await secondPage.close();
  report.observations.refresh = {
    sequentialRefreshCycles: 2,
    firstCycleAuthenticated: true,
    secondCycleAuthenticated: true,
    ordinaryParallelRequestCount: parallel.length,
    ordinaryParallelRequestsAuthenticated: parallel.length,
    sessionCiphertextChangedEachCycle: true,
    refreshTokenRotationPolicy: "realm revocation enabled; max reuse 0 (supplied configuration)",
    rotatedRefreshTokenContinuation: "pass",
    processLocalRefreshCache: "5S",
  };
  report.checks.refresh = "pass";
}

async function localLogout(context, page) {
  const missing = await page.evaluate(async () => (await fetch("/search/api/auth/local-logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "JavaScript" },
    body: "",
  })).status);
  assert.equal(missing, 400);
  assert.equal((await fetchSession(page)).body?.authenticated, true);
  const valid = await page.evaluate(async () => {
    const csrf = document.cookie.split("; ").find((part) => part.startsWith("csrf-token="))?.split("=")[1] ?? "";
    return (await fetch("/search/api/auth/local-logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-TOKEN": csrf,
        "X-Requested-With": "JavaScript",
      },
      body: "",
    })).status;
  });
  assert.equal(valid, 204);
  assert.equal((await fetchSession(page)).body?.authenticated, false);
  assert.ok(!(await context.cookies(`${appBase}auth-probe.html`)).some(({ name }) => name.startsWith("q_session")));
  report.observations.localLogout = { missingCsrfStatus: missing, validCsrfStatus: valid, sessionCleared: true };
  report.checks.localLogout = "pass";
}

async function rpLogout(context) {
  const invalid = await context.request.get(`${postLogoutUrl}?state=invalid`);
  assert.equal(invalid.status(), 400);
  const page = await login(context);
  const providerBefore = providerRequests.length;
  await page.goto(`${appBase}api/auth/rp-logout`, { waitUntil: "commit", timeout: 45_000 });
  await page.waitForURL((url) => url.href.startsWith(postLogoutUrl), { waitUntil: "commit", timeout: 45_000 });
  const responseBody = JSON.parse(await page.textContent("body"));
  assert.deepEqual(responseBody, { logoutStateValid: true });
  const finalUrl = new URL(page.url());
  assert.equal(`${finalUrl.origin}${finalUrl.pathname}`, postLogoutUrl);
  assert.deepEqual([...new Set(finalUrl.searchParams.keys())].sort(), ["state"]);
  const logoutRequests = providerRequests.slice(providerBefore)
    .filter(({ path }) => path === new URL(discovery.end_session_endpoint).pathname);
  assert.ok(logoutRequests.some(({ method }) => method === "POST"));
  assert.ok(logoutRequests.every(({ queryNames }) => !queryNames.includes("id_token_hint")));
  assert.ok(!(await context.cookies(`${appBase}auth-probe.html`)).some(({ name }) => name.startsWith("q_session")));
  report.observations.rpLogout = {
    localInitiationMethod: "GET",
    localInitiationCsrfProtected: false,
    providerMethod: "POST",
    endpoint: discovery.end_session_endpoint,
    idTokenHintInUrl: false,
    exactPostLogoutRedirect: postLogoutUrl,
    invalidOrMissingStateStatus: invalid.status(),
    validStateAccepted: true,
    applicationSessionCleared: true,
  };
  report.checks.rpLogout = "pass-with-existing-get-concern";
  await page.close();
}

function assertAuthorizationRequest() {
  const auth = report.observations.authorizationRequest;
  assert.ok(auth, "No authorization request was observed");
  assert.equal(auth.clientIdMatches, true);
  assert.equal(auth.redirectUri, callbackUrl);
  assert.equal(auth.responseType, "code");
  assert.equal(auth.codeChallengeMethod, "S256");
  assert.ok(auth.codeChallengeBytes >= 43);
  assert.equal(auth.statePresent, true);
  assert.equal(auth.noncePresent, true);
  const callback = applicationRequests.find(({ path, queryNames }) => path === "/search/api/auth/callback"
    && queryNames.includes("code") && queryNames.includes("state"));
  assert.ok(callback, "No authorization callback was observed");
  report.observations.callback = { path: callback.path, queryNames: callback.queryNames, exactRegisteredUrl: callbackUrl };
  report.observations.clientAuthentication = {
    method: "client_secret_basic",
    evidence: "Quarkus credentials.secret contract plus successful exchange against a basic-only client",
    secretExposed: false,
  };
  report.checks.authorizationCode = "pass";
  report.checks.pkceS256 = "pass";
  report.checks.stateNonceAndIdTokenValidation = "pass";
  report.checks.clientSecretBasic = "pass";
}

async function runExperiment() {
  await mkdir(temporaryDirectory, { recursive: true, mode: 0o700 });
  await mkdir(reportDirectory, { recursive: true });
  await assertPortsFree();
  secrets.clientSecret = await loadSecret(clientSecretPath);
  secrets.testPassword = await loadSecret(testPasswordPath);
  report.source = await captureSource();
  await inspectDiscovery();

  const tls = await createCertificate();
  await startApplicationProxy(tls);
  await startQuarkus();
  browser = await chromium.launch();

  await anonymousChecks();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await installNetworkBoundary(context, { allowKeycloak: true });
  const page = await login(context, { requireCredentials: true });
  assert.equal(page.url(), `${appBase}auth-probe.html`);
  assertAuthorizationRequest();
  const session = await fetchSession(page);
  assert.deepEqual(session, { status: 200, body: { authenticated: true, name: username } });
  report.observations.sessionProjection = { keys: Object.keys(session.body).sort(), ...session.body };
  const initial = await measureSession(context, page, "initialSession");
  await browserLeakCheck(context, page);
  await refreshChecks(context, page, initial);
  await localLogout(context, page);
  await page.close();
  await rpLogout(context);
  await context.close();

  const logText = quarkusLogs.join("");
  assert.equal(logText.includes(secrets.clientSecret), false);
  assert.equal(logText.includes(secrets.testPassword), false);
  assert.equal(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(logText), false);
  report.observations.logSafety = { clientSecret: false, testPassword: false, jwtShapedValue: false };
  report.checks.logSafety = "pass";
  report.finishedAt = new Date().toISOString();
  report.result = "pass";
}

async function cleanup() {
  if (browser) await browser.close().catch(() => {});
  await stopQuarkus().catch(() => {});
  if (appProxy) await new Promise((resolve) => appProxy.close(resolve));
  await rm(temporaryDirectory, { recursive: true, force: true });
  secrets.clientSecret = "";
  secrets.testPassword = "";
  secrets.encryptionSecret = "";
  secrets.stateSecret = "";
}

try {
  await runExperiment();
} catch (error) {
  report.finishedAt = new Date().toISOString();
  report.result = "fail";
  report.failure = redact(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(`Phase 2C evidence: ${reportPath}`);
  console.log(`result=${report.result}`);
  if (report.failure) console.error(report.failure);
}
