import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const mode = process.argv[2];
if (!new Set(["stateless", "valkey"]).has(mode)) {
  throw new Error("Usage: node scripts/phase2/run-auth-experiment.mjs <stateless|valkey>");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runId = `${Date.now()}-${process.pid}`;
const ownerLabel = `spectrasearch.phase2.run=${runId}`;
const keycloakName = `spectrasearch-phase2-keycloak-${runId}`;
const valkeyName = `spectrasearch-phase2-valkey-${runId}`;
const temporaryDirectory = path.join(os.tmpdir(), `spectrasearch-phase2-${runId}`);
const certificatePath = path.join(temporaryDirectory, "phase2.crt");
const privateKeyPath = path.join(temporaryDirectory, "phase2.key");
const trustStorePath = path.join(temporaryDirectory, "phase2-truststore.p12");
const reportDirectory = path.join(root, "phase2-results");
const reportPath = path.join(reportDirectory, `${mode}-${runId}.json`);
const keycloakImage = "quay.io/keycloak/keycloak@sha256:ff4257d0d64efbe99ed1ddfaf07765cc3c36dc7518bf8324d41961327f441c54";
const valkeyImage = "valkey/valkey@sha256:c123e3715db63d06d4ad6964884037aa0d5d4d703939b9929954112889708e1d";

const ports = {
  app: 50722,
  quarkus: 50723,
  keycloakRelay: 50724,
  keycloak: 50725,
  keycloakManagement: 50726,
  valkey: 50727,
};

const urls = {
  app: `https://127.0.0.1:${ports.app}/search/`,
  quarkusHealth: `http://127.0.0.1:${ports.quarkus}/health`,
  keycloak: `http://127.0.0.1:${ports.keycloak}`,
  keycloakRelay: `https://127.0.0.1:${ports.keycloakRelay}`,
  keycloakReady: `http://127.0.0.1:${ports.keycloakManagement}/health/ready`,
};

const secrets = {
  adminPassword: randomBytes(32).toString("hex"),
  clientSecret: randomBytes(32).toString("hex"),
  encryptionSecret: randomBytes(32).toString("hex"),
  stateSecret: randomBytes(32).toString("hex"),
  testUserPassword: randomBytes(24).toString("hex"),
  valkeyPassword: randomBytes(32).toString("hex"),
  valkeyAdminPassword: randomBytes(32).toString("hex"),
};

const report = {
  mode,
  runId,
  startedAt: new Date().toISOString(),
  topology: {
    app: urls.app,
    quarkus: `127.0.0.1:${ports.quarkus}`,
    keycloakRelay: `127.0.0.1:${ports.keycloakRelay}`,
    keycloak: `127.0.0.1:${ports.keycloak}`,
    keycloakManagement: `127.0.0.1:${ports.keycloakManagement}`,
    valkey: mode === "valkey" ? `127.0.0.1:${ports.valkey}` : null,
  },
  limits: {
    traefikMaxHeaderBytes: 1_048_576,
    quarkusHttp1MaxHeaderBytes: 20_480,
    chromiumCookieNameAndValueBytes: 4_096,
    quarkusOidcCookieValueChunkCharacters: 4_056,
    localProtocol: "HTTP/1.1 over loopback TLS termination",
  },
  versions: {
    quarkus: "3.39.3",
    keycloakImage,
    valkeyImage: mode === "valkey" ? valkeyImage : null,
  },
  checks: {},
  measurements: {},
  observations: {},
};

const applicationRequests = [];
const applicationResponses = [];
const browserRequests = [];
const browserConsole = [];
const quarkusLogs = [];
const keycloakRelay = {
  grants: { authorization_code: 0, refresh_token: 0, other: 0 },
  authorizationTamper: undefined,
  authorizationTamperCount: 0,
  accessTokens: new Set(),
  refreshTokens: new Set(),
  idTokens: new Set(),
  logoutIdTokenHints: [],
};

let appProxy;
let keycloakProxy;
let quarkusProcess;
let browser;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function secretEnvironment(extra = {}) {
  return {
    ...process.env,
    PHASE2_OIDC_CLIENT_SECRET: secrets.clientSecret,
    PHASE2_TEST_USER_PASSWORD: secrets.testUserPassword,
    ...extra,
  };
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: options.env ?? process.env,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    if (options.input !== undefined) child.stdin.end(options.input);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0 || options.allowFailure) {
        resolve({ code, stdout, stderr });
      } else {
        reject(new Error(`${command} failed with exit code ${code}: ${redact(stderr || stdout)}`));
      }
    });
  });
}

function redact(value) {
  let redacted = String(value);
  for (const secret of Object.values(secrets)) {
    redacted = redacted.replaceAll(secret, "[REDACTED]");
  }
  for (const token of [
    ...keycloakRelay.accessTokens,
    ...keycloakRelay.refreshTokens,
    ...keycloakRelay.idTokens,
  ]) {
    redacted = redacted.replaceAll(token, "[REDACTED_TOKEN]");
  }
  redacted = redacted
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/([?&](?:code|state|id_token_hint)=)[^&\s]+/g, "$1[REDACTED]")
    .replace(/((?:q_session(?:_[^=;\s]*)?|q_auth_[^=;\s]*|q_post_logout|csrf-token)=)[^;\s]+/g,
      "$1[REDACTED_COOKIE]");
  return redacted;
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
    const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
    for (const entry of entries) {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) files.push(child);
    }
  }
  await visit(relativeDirectory);
  return files;
}

async function captureProvenance() {
  const head = (await run("git", ["rev-parse", "HEAD"])).stdout.trim();
  const sourcePaths = (await run("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]))
    .stdout.split("\0").filter(Boolean);
  return {
    head,
    sourceTreeSha256: await fileTreeFingerprint(sourcePaths),
    quarkusArtifactSha256: await fileTreeFingerprint(await directoryFiles("target/quarkus-app")),
  };
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

async function waitForUrl(url, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
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
  await run("keytool", [
    "-importcert", "-noprompt", "-alias", "phase2-local",
    "-file", certificatePath,
    "-keystore", trustStorePath,
    "-storetype", "PKCS12",
    "-storepass", "changeit",
  ]);
  return {
    key: await readFile(privateKeyPath),
    cert: await readFile(certificatePath),
  };
}

function startKeycloakRelay(tls) {
  keycloakProxy = https.createServer(tls, (request, response) => {
    const requestChunks = [];
    let upstreamPath = request.url;
    const isAuthorizationRequest = request.method === "GET"
      && request.url.startsWith("/realms/spectrasearch-phase2/protocol/openid-connect/auth?");
    if (isAuthorizationRequest && keycloakRelay.authorizationTamper) {
      const upstreamUrl = new URL(request.url, urls.keycloakRelay);
      upstreamUrl.searchParams.set(
        keycloakRelay.authorizationTamper.parameter,
        keycloakRelay.authorizationTamper.replacement,
      );
      upstreamPath = `${upstreamUrl.pathname}${upstreamUrl.search}`;
      keycloakRelay.authorizationTamperCount += 1;
    }
    const upstream = http.request({
      host: "127.0.0.1",
      port: ports.keycloak,
      method: request.method,
      path: upstreamPath,
      headers: request.headers,
    }, (upstreamResponse) => {
      const responseChunks = [];
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.on("data", (chunk) => {
        responseChunks.push(chunk);
        response.write(chunk);
      });
      upstreamResponse.on("end", () => {
        response.end();
        if (request.url.includes("/protocol/openid-connect/token")) {
          const parameters = new URLSearchParams(Buffer.concat(requestChunks).toString("utf8"));
          const grantType = parameters.get("grant_type");
          if (grantType in keycloakRelay.grants) {
            keycloakRelay.grants[grantType] += 1;
          } else {
            keycloakRelay.grants.other += 1;
          }
          try {
            const tokens = JSON.parse(Buffer.concat(responseChunks).toString("utf8"));
            if (tokens.access_token) keycloakRelay.accessTokens.add(tokens.access_token);
            if (tokens.refresh_token) keycloakRelay.refreshTokens.add(tokens.refresh_token);
            if (tokens.id_token) keycloakRelay.idTokens.add(tokens.id_token);
          } catch {
            // Error token responses are intentionally counted without recording their bodies.
          }
        }
      });
    });
    upstream.on("error", (error) => {
      if (!response.headersSent) response.writeHead(502);
      response.end(`Keycloak unavailable: ${error.message}`);
    });
    request.on("data", (chunk) => {
      requestChunks.push(chunk);
      upstream.write(chunk);
    });
    request.on("end", () => upstream.end());
  });
  return new Promise((resolve, reject) => {
    keycloakProxy.once("error", reject);
    keycloakProxy.listen(ports.keycloakRelay, "127.0.0.1", resolve);
  });
}

function startApplicationProxy(tls) {
  appProxy = https.createServer(tls, (request, response) => {
    const queryStart = request.url.indexOf("?");
    const rawPath = queryStart === -1 ? request.url : request.url.slice(0, queryStart);
    const rawQuery = queryStart === -1 ? "" : request.url.slice(queryStart);
    if (rawPath === "/search") {
      response.writeHead(301, { location: `/search/${rawQuery}` });
      response.end();
      return;
    }
    if (!rawPath.startsWith("/search/")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

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

    applicationRequests.push({
      url: request.url,
      cookieBytes: Buffer.byteLength(request.headers.cookie ?? "", "utf8"),
      rawHeaderBytes: request.rawHeaders.reduce((total, value) => total + Buffer.byteLength(value, "utf8") + 2, 2),
      searchable: `${request.url}\n${Object.entries(request.headers).map(([key, value]) => `${key}:${value}`).join("\n")}`,
    });

    const upstream = http.request({
      host: "127.0.0.1",
      port: ports.quarkus,
      method: request.method,
      path: `/${rawPath.slice("/search/".length)}${rawQuery}`,
      headers: requestHeaders,
    }, (upstreamResponse) => {
      const chunks = [];
      const setCookies = upstreamResponse.headers["set-cookie"] ?? [];
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.on("data", (chunk) => {
        chunks.push(chunk);
        response.write(chunk);
      });
      upstreamResponse.on("end", () => {
        response.end();
        const contentType = upstreamResponse.headers["content-type"] ?? "";
        applicationResponses.push({
          url: request.url,
          status: upstreamResponse.statusCode,
          setCookies,
          searchable: /(?:json|text|html)/i.test(contentType) ? Buffer.concat(chunks).toString("utf8") : "",
        });
      });
    });
    upstream.on("error", (error) => {
      if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain" });
      response.end(`Quarkus unavailable: ${error.message}`);
    });
    request.pipe(upstream);
  });
  return new Promise((resolve, reject) => {
    appProxy.once("error", reject);
    appProxy.listen(ports.app, "127.0.0.1", resolve);
  });
}

async function startKeycloak() {
  const realm = path.join(root, "src/test/resources/phase2/keycloak-realm.json");
  await run("docker", [
    "run", "--detach", "--name", keycloakName,
    "--label", ownerLabel,
    "--publish", `127.0.0.1:${ports.keycloak}:8080`,
    "--publish", `127.0.0.1:${ports.keycloakManagement}:9000`,
    "--memory", "1g",
    "--env", "KC_BOOTSTRAP_ADMIN_USERNAME=phase2-admin",
    "--env", "KC_BOOTSTRAP_ADMIN_PASSWORD",
    "--env", "PHASE2_OIDC_CLIENT_SECRET",
    "--env", "PHASE2_TEST_USER_PASSWORD",
    "--mount", `type=bind,src=${realm},dst=/opt/keycloak/data/import/spectrasearch-phase2-realm.json,readonly`,
    keycloakImage,
    "start-dev", "--import-realm", "--health-enabled=true", "--metrics-enabled=true",
    `--hostname=${urls.keycloakRelay}`,
  ], {
    env: secretEnvironment({ KC_BOOTSTRAP_ADMIN_PASSWORD: secrets.adminPassword }),
  });
  await waitForUrl(urls.keycloakReady, 120_000);
}

async function stopKeycloak() {
  await run("docker", ["stop", "--time", "10", keycloakName]);
}

async function restartKeycloak() {
  await run("docker", ["start", keycloakName]);
  await waitForUrl(urls.keycloakReady, 120_000);
}

async function startValkey() {
  const config = [
    "bind 0.0.0.0",
    "protected-mode yes",
    "port 6379",
    "save \"\"",
    "appendonly no",
    "maxmemory 32mb",
    "maxmemory-policy noeviction",
    "user default off",
    `user phase2 on >${secrets.valkeyPassword} ~oidc:token:* +get +set +del +@connection`,
    `user phase2-admin on >${secrets.valkeyAdminPassword} ~* +@all`,
    "",
  ].join("\n");
  await run("docker", [
    "run", "--detach", "--name", valkeyName,
    "--label", ownerLabel,
    "--publish", `127.0.0.1:${ports.valkey}:6379`,
    "--memory", "96m",
    "--env", "PHASE2_VALKEY_CONFIG",
    valkeyImage,
    "sh", "-c",
    "umask 077; printf '%s' \"$PHASE2_VALKEY_CONFIG\" > /tmp/phase2-valkey.conf; chown valkey:valkey /tmp/phase2-valkey.conf; exec setpriv --reuid=valkey --regid=valkey --init-groups valkey-server /tmp/phase2-valkey.conf",
  ], { env: secretEnvironment({ PHASE2_VALKEY_CONFIG: config }) });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const result = await run("docker", [
      "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
      "valkey-cli", "--user", "phase2", "ping",
    ], { env: { ...process.env, VALKEYCLI_AUTH: secrets.valkeyPassword }, allowFailure: true });
    if (result.code === 0 && result.stdout.trim() === "PONG") return;
    await delay(250);
  }
  const inspect = await run("docker", [
    "inspect", "--format", "{{.State.Status}} {{.State.ExitCode}} {{.State.Error}}", valkeyName,
  ], { allowFailure: true });
  const logs = await run("docker", ["logs", valkeyName], { allowFailure: true });
  throw new Error(`Valkey did not become ready: ${redact(inspect.stdout)} ${redact(logs.stderr || logs.stdout)}`);
}

async function removeValkeySession() {
  const environment = { ...process.env, VALKEYCLI_AUTH: secrets.valkeyAdminPassword };
  const result = await run("docker", [
    "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
    "valkey-cli", "--user", "phase2-admin", "--json", "eval",
    "local keys=redis.call('keys','oidc:token:*'); if #keys == 0 then return 0 end; return redis.call('del',keys[1])",
    "0",
  ], { env: environment });
  assert.equal(Number(result.stdout.trim()), 1, "Expected one Valkey OIDC state key");
}

async function clearValkeyStates() {
  const environment = { ...process.env, VALKEYCLI_AUTH: secrets.valkeyAdminPassword };
  await run("docker", [
    "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
    "valkey-cli", "--user", "phase2-admin", "--json", "eval",
    "local keys=redis.call('keys','oidc:token:*'); if #keys == 0 then return 0 end; return redis.call('del',unpack(keys))",
    "0",
  ], { env: environment });
}

async function inspectValkeyState() {
  const environment = { ...process.env, VALKEYCLI_AUTH: secrets.valkeyAdminPassword };
  const result = await run("docker", [
    "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
    "valkey-cli", "--user", "phase2-admin", "--json", "eval",
    "local keys=redis.call('keys','oidc:token:*'); if #keys == 0 then return {} end; return {#keys,keys[1],redis.call('ttl',keys[1]),redis.call('get',keys[1])}",
    "0",
  ], { env: environment });
  const [keyCount, key, ttlSeconds, value] = JSON.parse(result.stdout);
  assert.ok(keyCount >= 1);
  assert.ok(key.startsWith("oidc:token:"));
  assert.ok(ttlSeconds > 0);
  const allTokens = [...keycloakRelay.accessTokens, ...keycloakRelay.refreshTokens, ...keycloakRelay.idTokens];
  assert.ok(allTokens.every((token) => !value.includes(token)));
  const tokenRecord = JSON.parse(value);
  const encryptedParts = [tokenRecord.idToken, tokenRecord.accessToken, tokenRecord.refreshToken];
  assert.ok(encryptedParts.every((part) => typeof part === "string" && part.length > 0));
  const encryption = [...new Map(encryptedParts.map((part) => {
    const header = jweProtectedHeader(part);
    assert.equal(header.alg, "A256GCMKW");
    assert.equal(header.enc, "A256GCM");
    return [`${header.alg}:${header.enc}`, { alg: header.alg, enc: header.enc }];
  })).values()];
  return {
    keyCount,
    keyPrefix: "oidc:token:<opaque UUID>",
    keyReferenceBytes: Buffer.byteLength(key.slice("oidc:token:".length), "utf8"),
    ttlSeconds,
    valueBytes: Buffer.byteLength(value, "utf8"),
    encryptedPartCount: encryptedParts.length,
    encryption,
    containsRawAccessRefreshOrIdToken: false,
  };
}

async function valkeyMetadata() {
  const environment = { ...process.env, VALKEYCLI_AUTH: secrets.valkeyAdminPassword };
  const result = await run("docker", [
    "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
    "valkey-cli", "--user", "phase2-admin", "--no-auth-warning", "info", "persistence",
  ], { env: environment });
  return {
    appendOnly: /aof_enabled:1/.test(result.stdout),
    rdbChangesSinceLastSave: Number(result.stdout.match(/rdb_changes_since_last_save:(\d+)/)?.[1] ?? 0),
    configuredPolicy: "noeviction",
  };
}

async function waitForValkey() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const result = await run("docker", [
      "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
      "valkey-cli", "--user", "phase2", "ping",
    ], { env: { ...process.env, VALKEYCLI_AUTH: secrets.valkeyPassword }, allowFailure: true });
    if (result.code === 0 && result.stdout.trim() === "PONG") return;
    await delay(250);
  }
  throw new Error("Valkey did not become ready after restart");
}

function quarkusEnvironment({ splitTokens = false, refreshCacheTtl = "5S", encryptionSecret, logoutMode = "query" } = {}) {
  const environment = {
    ...process.env,
    QUARKUS_PROFILE: "phase2",
    PHASE2_OIDC_AUTH_SERVER_URL: `${urls.keycloakRelay}/realms/spectrasearch-phase2`,
    PHASE2_OIDC_CLIENT_SECRET: secrets.clientSecret,
    PHASE2_OIDC_ENCRYPTION_SECRET: encryptionSecret ?? secrets.encryptionSecret,
    PHASE2_OIDC_STATE_SECRET: secrets.stateSecret,
    PHASE2_REFRESH_CACHE_TTL: refreshCacheTtl,
    PHASE2_SPLIT_TOKENS: String(splitTokens),
    PHASE2_LOGOUT_MODE: logoutMode,
  };
  if (mode === "valkey") {
    environment.PHASE2_VALKEY_URI = `redis://phase2:${secrets.valkeyPassword}@127.0.0.1:${ports.valkey}`;
    environment.QUARKUS_REDIS_HOSTS = environment.PHASE2_VALKEY_URI;
    environment.QUARKUS_REDIS_TIMEOUT = "1S";
    environment.QUARKUS_REDIS_TCP_CONNECTION_TIMEOUT = "1S";
    environment.QUARKUS_REDIS_MAX_POOL_SIZE = "8";
  }
  return environment;
}

async function startQuarkus(options = {}, timeout = 30_000) {
  assert.equal(quarkusProcess, undefined, "Quarkus is already running");
  const jar = path.join(root, "target/quarkus-app/quarkus-run.jar");
  quarkusProcess = spawn("java", [
    `-Dquarkus.http.host=127.0.0.1`,
    `-Dquarkus.http.port=${ports.quarkus}`,
    `-Djavax.net.ssl.trustStore=${trustStorePath}`,
    "-Djavax.net.ssl.trustStorePassword=changeit",
    "-Djavax.net.ssl.trustStoreType=PKCS12",
    "-jar", jar,
  ], {
    cwd: root,
    env: quarkusEnvironment(options),
    stdio: ["ignore", "pipe", "pipe"],
  });
  quarkusProcess.stdout.on("data", (chunk) => quarkusLogs.push(chunk.toString("utf8")));
  quarkusProcess.stderr.on("data", (chunk) => quarkusLogs.push(chunk.toString("utf8")));
  try {
    await waitForUrl(urls.quarkusHealth, timeout);
  } catch (error) {
    const exited = quarkusProcess.exitCode !== null;
    await stopQuarkus();
    throw new Error(`${error.message}; Quarkus exited=${exited}; logs=${redact(quarkusLogs.join(""))}`);
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

async function adminAccessToken() {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: "phase2-admin",
    password: secrets.adminPassword,
  });
  const response = await fetch(`${urls.keycloak}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  assert.equal(response.status, 200, "Keycloak admin login failed");
  return (await response.json()).access_token;
}

async function keycloakEventCount(type) {
  const adminToken = await adminAccessToken();
  const endpoint = new URL(`${urls.keycloak}/admin/realms/spectrasearch-phase2/events`);
  endpoint.searchParams.append("type", type);
  endpoint.searchParams.set("client", "spectrasearch-phase2");
  endpoint.searchParams.set("max", "1000");
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${adminToken}` } });
  assert.equal(response.status, 200, `Keycloak event query for ${type} failed`);
  return (await response.json()).length;
}

function observePage(page) {
  page.on("request", (request) => browserRequests.push(request.url()));
  page.on("console", (message) => browserConsole.push(message.text()));
  page.on("pageerror", (error) => browserConsole.push(error.message));
}

async function fetchSession(page) {
  return page.evaluate(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/search/api/auth/session", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "JavaScript" },
        signal: controller.signal,
      });
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { body = null; }
      return { status: response.status, body };
    } catch (error) {
      return { status: 0, body: null, error: error.name === "AbortError" ? "client-timeout" : "network-error" };
    } finally {
      clearTimeout(timeout);
    }
  });
}

async function login(context) {
  const page = await context.newPage();
  observePage(page);
  await page.goto(`${urls.app}api/auth/login`);
  await page.locator("#username").fill("phase2-user");
  await page.locator("#password").fill(secrets.testUserPassword);
  await Promise.all([
    page.waitForURL(`${urls.app}auth-probe.html`, { timeout: 30_000 }),
    page.locator("#kc-login").click(),
  ]);
  await page.locator(".status-authenticated").waitFor({ timeout: 15_000 });
  return page;
}

async function browserState(page) {
  return page.evaluate(async () => ({
    url: location.href,
    html: document.documentElement.outerHTML,
    readableCookies: document.cookie,
    localStorage: Object.entries(localStorage),
    sessionStorage: Object.entries(sessionStorage),
    indexedDatabases: indexedDB.databases ? (await indexedDB.databases()).map(({ name, version }) => ({ name, version })) : [],
    cacheNames: "caches" in window ? await caches.keys() : [],
    serviceWorkers: "serviceWorker" in navigator
      ? (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.scope)
      : [],
  }));
}

function cookieMeasurements(cookies) {
  return cookies.map((cookie) => ({
    name: cookie.name,
    valueBytes: Buffer.byteLength(cookie.value, "utf8"),
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expires: cookie.expires,
  }));
}

function jweProtectedHeader(value) {
  const [encodedHeader] = value.split(".");
  return JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
}

function normalizedCookieName(name) {
  return name.startsWith("q_auth_") ? "q_auth_<flow>" : name;
}

function setCookieMeasurements() {
  const measurements = new Map();
  for (const response of applicationResponses) {
    for (const header of response.setCookies) {
      const measurement = {
        path: response.url.split("?")[0],
        name: normalizedCookieName(header.slice(0, header.indexOf("="))),
        bytes: Buffer.byteLength(header, "utf8"),
        deletion: /;\s*Max-Age=0(?:;|$)/i.test(header),
        secure: /;\s*Secure(?:;|$)/i.test(header),
        httpOnly: /;\s*HttpOnly(?:;|$)/i.test(header),
        sameSite: header.match(/;\s*SameSite=([^;]+)/i)?.[1] ?? null,
        cookiePath: header.match(/;\s*Path=([^;]+)/i)?.[1] ?? null,
      };
      const key = JSON.stringify(measurement);
      measurements.set(key, { ...measurement, count: (measurements.get(key)?.count ?? 0) + 1 });
    }
  }
  return [...measurements.values()];
}

function scanForLeaks(state) {
  const surfaces = {
    appRequests: applicationRequests.map(({ searchable }) => searchable).join("\n"),
    appResponses: applicationResponses.map(({ searchable }) => searchable).join("\n"),
    appResponseSetCookies: applicationResponses.flatMap(({ setCookies }) => setCookies).join("\n"),
    browserUrls: browserRequests.join("\n"),
    browserConsole: browserConsole.join("\n"),
    quarkusLogs: quarkusLogs.join("\n"),
    dom: state.html,
    readableCookies: state.readableCookies,
    storage: JSON.stringify([state.localStorage, state.sessionStorage, state.indexedDatabases, state.cacheNames]),
  };
  const leaks = [];
  for (const [kind, tokens] of [["access", keycloakRelay.accessTokens], ["refresh", keycloakRelay.refreshTokens]]) {
    for (const token of tokens) {
      for (const [surface, value] of Object.entries(surfaces)) {
        if (value.includes(token)) leaks.push({ kind, surface });
      }
    }
  }
  return {
    accessTokensObservedServerSide: keycloakRelay.accessTokens.size,
    refreshTokensObservedServerSide: keycloakRelay.refreshTokens.size,
    leaks,
    jwtShapedBrowserReadableValue: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(
      `${state.html}\n${state.readableCookies}\n${JSON.stringify([state.localStorage, state.sessionStorage])}`,
    ),
  };
}

async function measureAuthenticatedSession(context, page, label) {
  const diagnostics = await page.evaluate(async () => {
    const response = await fetch("/search/api/auth/diagnostics", {
      credentials: "same-origin",
      headers: { "X-Requested-With": "JavaScript" },
    });
    return { status: response.status, body: await response.json() };
  });
  assert.equal(diagnostics.status, 200);
  assert.ok(diagnostics.body.accessTokenBytes > 0);
  assert.ok(diagnostics.body.idTokenBytes > 0);
  assert.ok(diagnostics.body.roleCount >= 22);
  assert.equal(diagnostics.body.allowedOriginCount, 20);

  const cookies = await context.cookies(`${urls.app}auth-probe.html`);
  const allKnownTokens = [
    ...keycloakRelay.accessTokens,
    ...keycloakRelay.refreshTokens,
    ...keycloakRelay.idTokens,
  ];
  assert.ok(cookies.every(({ value }) => allKnownTokens.every((token) => !value.includes(token))));
  const measuredCookies = cookieMeasurements(cookies);
  const sessionCookies = measuredCookies.filter(({ name }) => name.startsWith("q_session"));
  assert.ok(sessionCookies.length >= 1, "Expected a Quarkus session cookie");
  for (const cookie of sessionCookies) {
    assert.ok(Buffer.byteLength(cookie.name, "utf8") + cookie.valueBytes <= 4_096);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.path, "/search/");
    assert.equal(cookie.sameSite, "Lax");
  }
  assert.ok(!measuredCookies.some(({ name }) => name.startsWith("q_auth")), "OIDC state cookie remained after callback");

  const relevantRequests = applicationRequests.filter(({ url }) => url.startsWith("/search/api/auth/"));
  const largestRawRequestHeadersBytes = Math.max(...relevantRequests.map(({ rawHeaderBytes }) => rawHeaderBytes), 0);
  assert.ok(largestRawRequestHeadersBytes < report.limits.quarkusHttp1MaxHeaderBytes);
  let encryption;
  if (mode === "stateless") {
    const sessionState = cookies
      .filter(({ name }) => name.startsWith("q_session"))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
      .map(({ value }) => value)
      .join("");
    const header = jweProtectedHeader(sessionState);
    assert.equal(header.alg, "A256GCMKW");
    assert.equal(header.enc, "A256GCM");
    encryption = { alg: header.alg, enc: header.enc };
  }
  report.measurements[label] = {
    diagnostics: diagnostics.body,
    cookies: measuredCookies,
    sessionCookieCount: sessionCookies.length,
    sessionCookieValueBytes: sessionCookies.map(({ valueBytes }) => valueBytes),
    encryption,
    largestCookieHeaderBytes: Math.max(...relevantRequests.map(({ cookieBytes }) => cookieBytes), 0),
    largestRawRequestHeadersBytes,
    quarkusHeaderBytesRemaining: report.limits.quarkusHttp1MaxHeaderBytes - largestRawRequestHeadersBytes,
    traefikHeaderBytesRemaining: report.limits.traefikMaxHeaderBytes - largestRawRequestHeadersBytes,
  };
}

async function measureSessionRequestOverhead(page) {
  const durations = await page.evaluate(async () => {
    const samples = [];
    for (let index = 0; index < 25; index += 1) {
      const started = performance.now();
      const response = await fetch("/search/api/auth/diagnostics", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "JavaScript" },
      });
      if (!response.ok) throw new Error(`Diagnostic request failed with ${response.status}`);
      await response.text();
      samples.push(performance.now() - started);
    }
    return samples;
  });
  const sorted = [...durations].sort((left, right) => left - right);
  return {
    samples: sorted.length,
    medianMilliseconds: Number(sorted[Math.floor(sorted.length / 2)].toFixed(3)),
    p95Milliseconds: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(3)),
    maximumMilliseconds: Number(sorted.at(-1).toFixed(3)),
  };
}

async function anonymousChecks() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observePage(page);
  await page.goto(`${urls.app}auth-probe.html`);
  await page.locator(".status-anonymous").waitFor();
  const session = await fetchSession(page);
  assert.deepEqual(session, { status: 200, body: { authenticated: false } });
  const cookies = await context.cookies(`${urls.app}auth-probe.html`);
  assert.ok(!cookies.some(({ name }) => name.startsWith("q_session")));
  await context.close();
  report.checks.anonymous = "pass";
}

async function keycloakRuntimeOutageCheck() {
  await stopKeycloak();
  await anonymousChecks();
  await restartKeycloak();
  report.checks.anonymousWhileKeycloakDown = "pass";
}

async function startupWithoutKeycloakCheck() {
  await stopQuarkus();
  await stopKeycloak();
  try {
    await startQuarkus({}, 20_000);
    const response = await fetch(urls.quarkusHealth);
    assert.equal(response.status, 200);
    await anonymousChecks();
    report.checks.startupWithoutKeycloak = "pass";
  } catch (error) {
    report.checks.startupWithoutKeycloak = "fail";
    report.observations.startupWithoutKeycloak = redact(error.message);
    throw new Error("HARD_GATE: Quarkus could not serve the anonymous shell when started without Keycloak");
  } finally {
    await stopQuarkus();
    await restartKeycloak();
    await startQuarkus();
  }
}

async function validSessionKeycloakOutageCheck(context, page) {
  await stopKeycloak();
  const session = await fetchSession(page);
  assert.equal(session.status, 200);
  assert.equal(session.body?.authenticated, true);
  await restartKeycloak();
  report.checks.validSessionWhileKeycloakDown = "pass";
}

async function stableRestartCheck(page) {
  const refreshes = keycloakRelay.grants.refresh_token;
  await stopQuarkus();
  await startQuarkus();
  const session = await fetchSession(page);
  assert.equal(session.status, 200);
  assert.equal(session.body?.authenticated, true);
  assert.equal(keycloakRelay.grants.refresh_token, refreshes);
  report.checks.stableEncryptionSecretRestart = "pass";
}

async function changedEncryptionSecretCheck() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  await stopQuarkus();
  await startQuarkus({ encryptionSecret: randomBytes(32).toString("hex") });
  const session = await fetchSession(page);
  assert.notEqual(session.status, 200);
  assert.notEqual(session.body?.authenticated, false);
  report.observations.changedEncryptionSecret = { sessionStatus: session.status };
  await context.close();
  await stopQuarkus();
  await startQuarkus();
  report.checks.changedEncryptionSecretRejected = "pass";
}

async function tamperedSessionCookieCheck() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  const sessionCookies = (await context.cookies(`${urls.app}auth-probe.html`))
    .filter(({ name }) => name.startsWith("q_session"));
  assert.ok(sessionCookies.length >= 1);
  const original = sessionCookies[0].value;
  const last = original.at(-1);
  sessionCookies[0].value = `${original.slice(0, -1)}${last === "A" ? "B" : "A"}`;
  await context.addCookies(sessionCookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  })));
  const session = await fetchSession(page);
  assert.notEqual(session.status, 200);
  assert.notEqual(session.body?.authenticated, false);
  const cookiePresent = (await context.cookies(`${urls.app}auth-probe.html`))
    .some(({ name }) => name.startsWith("q_session"));
  report.observations.tamperedSessionCookie = {
    sessionStatus: session.status,
    cookiePresentAfterFailure: cookiePresent,
  };
  await context.close();
  report.checks.tamperedSessionCookieRejected = "pass";
}

async function refreshWhileKeycloakDownCheck() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  await stopKeycloak();
  await delay(16_500);
  const session = await fetchSession(page);
  assert.notEqual(session.status, 200);
  assert.notEqual(session.body?.authenticated, false);
  report.observations.refreshWhileKeycloakDown = { sessionStatus: session.status };
  await restartKeycloak();
  await context.close();
  report.checks.refreshWhileKeycloakDownFailsClosed = "pass";
}

async function parallelRefreshCheck({ refreshCacheTtl, waitMilliseconds, label, expectCoalesced }) {
  await stopQuarkus();
  await startQuarkus({ refreshCacheTtl });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  const secondPage = await context.newPage();
  observePage(secondPage);
  await secondPage.goto(`${urls.app}auth-probe.html`);
  await secondPage.locator(".status-authenticated").waitFor();

  const relayBefore = keycloakRelay.grants.refresh_token;
  const successBefore = await keycloakEventCount("REFRESH_TOKEN");
  const errorBefore = await keycloakEventCount("REFRESH_TOKEN_ERROR");
  await delay(waitMilliseconds);
  const results = await Promise.all([
    ...Array.from({ length: 4 }, () => fetchSession(page)),
    ...Array.from({ length: 4 }, () => fetchSession(secondPage)),
  ]);
  await delay(500);
  const relayDelta = keycloakRelay.grants.refresh_token - relayBefore;
  const successDelta = await keycloakEventCount("REFRESH_TOKEN") - successBefore;
  const errorDelta = await keycloakEventCount("REFRESH_TOKEN_ERROR") - errorBefore;
  const finalSession = await fetchSession(page);
  const observation = {
    requestStatuses: results.map(({ status }) => status),
    authenticatedResponses: results.filter(({ body }) => body?.authenticated).length,
    tokenEndpointRefreshRequests: relayDelta,
    keycloakRefreshSuccesses: successDelta,
    keycloakRefreshErrors: errorDelta,
    finalSessionStatus: finalSession.status,
    finalSessionAuthenticated: finalSession.body?.authenticated ?? false,
  };
  report.observations[label] = observation;
  if (expectCoalesced) {
    assert.equal(relayDelta, 1);
    assert.equal(successDelta, 1);
    assert.equal(errorDelta, 0);
    const reliable = results.every(({ status, body }) => status === 200 && body?.authenticated)
      && finalSession.body?.authenticated === true;
    report.checks[label] = reliable ? "pass" : "fail-session-loss";
    if (mode === "stateless") assert.equal(reliable, true);
  } else if (waitMilliseconds > 15_000) {
    report.observations.hardExpiredRefreshWithoutCache = observation.finalSessionAuthenticated
      ? "session-preserved"
      : "session-lost";
  }
  await context.close();
}

async function flowIntegrityChecks() {
  const badStateContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const badStatePage = await badStateContext.newPage();
  observePage(badStatePage);
  await badStatePage.goto(`${urls.app}api/auth/login`);
  const stateCookies = (await badStateContext.cookies(`${urls.app}api/auth/callback`))
    .filter(({ name }) => name.startsWith("q_auth_"));
  assert.equal(stateCookies.length, 1);
  assert.equal(stateCookies[0].secure, true);
  assert.equal(stateCookies[0].httpOnly, true);
  assert.equal(stateCookies[0].sameSite, "Lax");
  assert.equal(stateCookies[0].path, "/search/");
  const badStateResponse = await badStatePage.goto(`${urls.app}api/auth/callback?code=invalid&state=invalid`);
  assert.ok(badStateResponse.status() >= 400);
  assert.ok(!(await badStateContext.cookies(`${urls.app}auth-probe.html`)).some(({ name }) => name.startsWith("q_session")));
  report.measurements.authorizationStateCookie = {
    count: 1,
    valueBytes: Buffer.byteLength(stateCookies[0].value, "utf8"),
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    path: "/search/",
  };
  await badStateContext.close();

  const replayContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const requestsBefore = browserRequests.length;
  const replayPage = await login(replayContext);
  const callbackUrl = browserRequests.slice(requestsBefore)
    .find((url) => url.startsWith(`${urls.app}api/auth/callback?`));
  assert.ok(callbackUrl);
  await replayContext.clearCookies();
  const replayResponse = await replayPage.goto(callbackUrl);
  const replayCookies = await replayContext.cookies(`${urls.app}auth-probe.html`);
  assert.ok(!replayCookies.some(({ name }) => name.startsWith("q_session")));
  assert.ok(replayResponse.status() >= 400 || replayPage.url().startsWith(urls.keycloakRelay));
  report.observations.callbackReplay = {
    terminalStatus: replayResponse.status(),
    freshAuthorizationChallenge: replayPage.url().startsWith(urls.keycloakRelay),
    sessionCreated: false,
  };
  await replayContext.close();

  const returnContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const returnPage = await returnContext.newPage();
  observePage(returnPage);
  await returnPage.goto(`${urls.app}api/auth/login?returnTo=https://example.invalid/escape`);
  await returnPage.locator("#username").fill("phase2-user");
  await returnPage.locator("#password").fill(secrets.testUserPassword);
  await Promise.all([
    returnPage.waitForURL(`${urls.app}auth-probe.html`, { timeout: 30_000 }),
    returnPage.locator("#kc-login").click(),
  ]);
  assert.ok(!browserRequests.some((url) => url.startsWith("https://example.invalid")));
  await returnContext.close();

  await tamperedAuthorizationCheck("nonce", "tampered-nonce");
  await tamperedAuthorizationCheck("code_challenge", "A".repeat(43));
  report.checks.flowIntegrity = "pass";
}

async function tamperedAuthorizationCheck(parameter, replacement) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observePage(page);
  const tamperCountBefore = keycloakRelay.authorizationTamperCount;
  keycloakRelay.authorizationTamper = { parameter, replacement };
  try {
    await page.goto(`${urls.app}api/auth/login`);
  } finally {
    keycloakRelay.authorizationTamper = undefined;
  }
  assert.equal(keycloakRelay.authorizationTamperCount, tamperCountBefore + 1);
  await page.locator("#username").fill("phase2-user");
  await page.locator("#password").fill(secrets.testUserPassword);
  const callbackResponse = page.waitForResponse((response) => response.url().startsWith(`${urls.app}api/auth/callback`), {
    timeout: 30_000,
  });
  await page.locator("#kc-login").click();
  const response = await callbackResponse;
  await page.waitForLoadState("domcontentloaded");
  const sessionCreated = (await context.cookies(`${urls.app}auth-probe.html`))
    .some(({ name }) => name.startsWith("q_session"));
  report.observations[`tampered-${parameter}`] = {
    callbackStatus: response.status(),
    freshAuthorizationChallenge: page.url().startsWith(urls.keycloakRelay),
    sessionCreated,
  };
  assert.equal(sessionCreated, false, `${parameter} tampering created a session`);
  assert.ok(response.status() >= 400 || page.url().startsWith(urls.keycloakRelay));
  await context.close();
}

async function localLogoutAndRevocabilityCheck(context, page) {
  const before = (await context.cookies(`${urls.app}auth-probe.html`)).filter(({ name }) => name.startsWith("q_session"));
  assert.ok(before.length >= 1);
  const result = await page.evaluate(async () => {
    const csrf = document.cookie.split("; ").find((value) => value.startsWith("csrf-token="))?.split("=")[1] ?? "";
    const response = await fetch("/search/api/auth/local-logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-TOKEN": csrf,
        "X-Requested-With": "JavaScript",
      },
      body: "",
    });
    return response.status;
  });
  assert.equal(result, 204);
  const after = await context.cookies(`${urls.app}auth-probe.html`);
  assert.ok(!after.some(({ name }) => name.startsWith("q_session")));
  assert.equal((await fetchSession(page)).body?.authenticated, false);

  await context.addCookies(before);
  const restored = await fetchSession(page);
  report.observations.copiedSessionAfterLocalLogout = {
    status: restored.status,
    authenticated: restored.body?.authenticated ?? false,
  };
  await context.clearCookies();
  report.checks.localLogout = "pass";
}

async function csrfCheck() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  const missing = await page.evaluate(async () => (await fetch("/search/api/auth/local-logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "JavaScript" },
    body: "",
  })).status);
  assert.equal(missing, 400);
  const wrong = await page.evaluate(async () => (await fetch("/search/api/auth/local-logout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRF-TOKEN": "wrong-token",
      "X-Requested-With": "JavaScript",
    },
    body: "",
  })).status);
  assert.equal(wrong, 400);
  assert.equal((await fetchSession(page)).body?.authenticated, true);
  const attacker = await context.newPage();
  await attacker.goto(`${urls.keycloakRelay}/realms/spectrasearch-phase2/account/`);
  const crossOriginResponse = attacker.waitForResponse((response) => response.url() === `${urls.app}api/auth/local-logout`);
  await attacker.evaluate((action) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    document.body.append(form);
    form.submit();
  }, `${urls.app}api/auth/local-logout`);
  const crossOriginStatus = (await crossOriginResponse).status();
  assert.notEqual(crossOriginStatus, 204);
  assert.equal((await fetchSession(page)).body?.authenticated, true);
  report.observations.csrf = { missingTokenStatus: missing, wrongTokenStatus: wrong, crossOriginStatus };
  await context.close();
  report.checks.csrf = "pass";
}

async function staleCookieCheck() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observePage(page);
  await context.addCookies([{
    name: "q_session",
    value: "invalid-session-state",
    domain: "127.0.0.1",
    path: "/search/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  }]);
  const shell = await page.goto(`${urls.app}auth-probe.html`);
  assert.equal(shell.status(), 200);
  const cookiePresentBeforeSession = (await context.cookies(`${urls.app}auth-probe.html`))
    .some(({ name }) => name.startsWith("q_session"));
  const session = await fetchSession(page);
  const failedClosed = session.status > 0 && session.status !== 200 && session.body?.authenticated !== false;
  report.observations.staleCookie = {
    shellStatus: shell.status(),
    cookiePresentBeforeSession,
    sessionStatus: session.status,
    authenticated: session.body?.authenticated ?? null,
  };
  assert.equal(cookiePresentBeforeSession, true);
  if (mode === "stateless") assert.equal(failedClosed, true);
  await context.close();
  report.checks.staleCookieFailsClosed = failedClosed ? "pass" : "fail-anonymous-downgrade";
}

async function missingValkeyStateCheck() {
  await clearValkeyStates();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  await removeValkeySession();
  const session = await fetchSession(page);
  const cookiePresent = (await context.cookies(`${urls.app}auth-probe.html`))
    .some(({ name }) => name.startsWith("q_session"));
  const failedClosed = session.status !== 200 && session.body?.authenticated !== false;
  report.observations.missingValkeyState = { sessionStatus: session.status, cookiePresentAfterFailure: cookiePresent };
  await context.close();
  report.checks.missingValkeyStateFailsClosed = failedClosed ? "pass" : "fail-anonymous-downgrade";
}

async function valkeyOutageCheck() {
  await clearValkeyStates();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  await run("docker", ["pause", valkeyName]);
  const started = Date.now();
  let session;
  try {
    session = await fetchSession(page);
  } finally {
    await run("docker", ["unpause", valkeyName]);
  }
  const elapsedMilliseconds = Date.now() - started;
  const cookiePresent = (await context.cookies(`${urls.app}auth-probe.html`))
    .some(({ name }) => name.startsWith("q_session"));
  const failedClosed = session.status > 0 && session.status !== 200 && session.body?.authenticated !== false;
  report.observations.valkeyOutage = {
    sessionStatus: session.status,
    error: session.error ?? null,
    elapsedMilliseconds,
    cookiePresentAfterFailure: cookiePresent,
  };
  await context.close();
  report.checks.valkeyOutageFailsClosed = failedClosed ? "pass" : "fail-no-bounded-response";
}

async function rpLogoutCheck() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  const copiedSession = (await context.cookies(`${urls.app}auth-probe.html`))
    .filter(({ name }) => name.startsWith("q_session"));
  const requestsBefore = browserRequests.length;
  await page.evaluate((url) => window.location.assign(url), `${urls.app}api/auth/rp-logout`);
  await page.waitForURL((url) => url.href.startsWith(`${urls.app}api/auth/logged-out`), { timeout: 30_000 });
  const body = await page.textContent("body");
  assert.match(body, /logoutStateValid/);
  const logoutRequests = browserRequests.slice(requestsBefore);
  const hintUrl = logoutRequests.find((url) => url.includes("id_token_hint="));
  assert.ok(hintUrl, "Expected standards-defined id_token_hint on RP logout");
  const hint = new URL(hintUrl).searchParams.get("id_token_hint");
  keycloakRelay.logoutIdTokenHints.push(hint);
  assert.ok(keycloakRelay.idTokens.has(hint), "RP logout hint was not the observed ID token");
  assert.ok(!keycloakRelay.accessTokens.has(hint));
  assert.ok(!keycloakRelay.refreshTokens.has(hint));
  const cookies = await context.cookies(`${urls.app}auth-probe.html`);
  assert.ok(!cookies.some(({ name }) => name.startsWith("q_session")));
  report.observations.rpLogout = {
    initiationMethod: "GET",
    csrfProtected: false,
    logoutStateValid: true,
    idTokenHintBytes: Buffer.byteLength(hint, "utf8"),
    idTokenHintInUrl: true,
    accessOrRefreshTokenInUrl: false,
  };
  await context.addCookies(copiedSession);
  const copiedSessionResult = await fetchSession(page);
  report.observations.copiedSessionAfterRpLogout = {
    status: copiedSessionResult.status,
    authenticated: copiedSessionResult.body?.authenticated ?? false,
  };
  await context.close();
  report.checks.rpLogout = "pass";
}

async function formPostLogoutCheck() {
  await stopQuarkus();
  await startQuarkus({ logoutMode: "form-post" });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  const requestsBefore = browserRequests.length;
  const applicationRequestsBefore = applicationRequests.length;
  const responsesBefore = applicationResponses.length;
  const navigationError = await page.goto(`${urls.app}api/auth/rp-logout`, { waitUntil: "commit", timeout: 30_000 })
    .then(() => null, (error) => error);
  if (navigationError) {
    report.observations.formPostRpLogoutFailure = {
      finalUrlWithoutQuery: page.url().split("?")[0],
      recentConsole: browserConsole.slice(-5).map(redact),
      applicationRequests: applicationRequests.slice(applicationRequestsBefore).map(({ url }) => url.split("?")[0]),
      applicationResponses: applicationResponses.slice(responsesBefore).map(({ status, url }) => ({
        status,
        path: url.split("?")[0],
      })),
      recentQuarkusLogs: quarkusLogs.join("").split("\n").slice(-20).map(redact),
    };
    throw navigationError;
  }
  try {
    await page.waitForURL((url) => url.href.startsWith(`${urls.app}api/auth/logged-out`), {
      waitUntil: "commit",
      timeout: 30_000,
    });
  } catch (error) {
    report.observations.formPostRpLogoutFailure = {
      finalUrlWithoutQuery: page.url().split("?")[0],
      recentConsole: browserConsole.slice(-5).map(redact),
      applicationRequests: applicationRequests.slice(applicationRequestsBefore).map(({ url }) => url.split("?")[0]),
      applicationResponses: applicationResponses.slice(responsesBefore).map(({ status, url }) => ({
        status,
        path: url.split("?")[0],
      })),
      recentQuarkusLogs: quarkusLogs.join("").split("\n").slice(-20).map(redact),
    };
    throw error;
  }
  const logoutResponse = applicationResponses.slice(responsesBefore)
    .find(({ url }) => url.startsWith("/search/api/auth/rp-logout"));
  assert.ok(logoutResponse);
  const idToken = [...keycloakRelay.idTokens].find((token) => logoutResponse.searchable.includes(token));
  assert.ok(idToken, "Expected an ID token in the framework form-post logout response");
  assert.ok([...keycloakRelay.accessTokens].every((token) => !logoutResponse.searchable.includes(token)));
  assert.ok([...keycloakRelay.refreshTokens].every((token) => !logoutResponse.searchable.includes(token)));
  assert.ok(!browserRequests.slice(requestsBefore).some((url) => url.includes("id_token_hint=")));
  report.observations.formPostRpLogout = {
    logoutStateValid: true,
    idTokenInFrameworkHtml: true,
    idTokenHintInUrl: false,
    accessOrRefreshTokenInFrameworkHtml: false,
  };
  await context.close();
  report.checks.formPostRpLogout = "pass";
}

async function valkeyRestartCheck() {
  await clearValkeyStates();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  await run("docker", ["restart", "--time", "10", valkeyName]);
  await waitForValkey();
  const session = await fetchSession(page);
  const cookiePresent = (await context.cookies(`${urls.app}auth-probe.html`))
    .some(({ name }) => name.startsWith("q_session"));
  const failedClosed = session.status !== 200 && session.body?.authenticated !== false;
  report.observations.valkeyRestartWithoutPersistence = {
    sessionStatus: session.status,
    cookiePresentAfterFailure: cookiePresent,
  };
  await context.close();
  report.checks.valkeyRestartWithoutPersistence = failedClosed ? "pass" : "fail-anonymous-downgrade";
}

async function valkeyMemoryPressureCheck() {
  await clearValkeyStates();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  const environment = { ...process.env, VALKEYCLI_AUTH: secrets.valkeyAdminPassword };
  const fillerValue = Buffer.alloc(1024 * 1024, "x");
  let fillerKeysCreated = 0;
  let allocationRejected = false;
  for (let index = 1; index <= 64; index += 1) {
    const fill = await run("docker", [
      "exec", "--interactive", "--env", "VALKEYCLI_AUTH", valkeyName,
      "valkey-cli", "--user", "phase2-admin", "--no-auth-warning", "-x", "set", `phase2-filler:${index}`,
    ], { env: environment, input: fillerValue, allowFailure: true });
    if (fill.code !== 0 || /(?:OOM|ERR)/.test(`${fill.stdout}${fill.stderr}`)) {
      allocationRejected = true;
      break;
    }
    fillerKeysCreated += 1;
  }
  assert.equal(allocationRejected, true);
  const stats = await run("docker", [
    "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
    "valkey-cli", "--user", "phase2-admin", "--no-auth-warning", "info", "stats",
  ], { env: environment });
  const evictedKeys = Number(stats.stdout.match(/evicted_keys:(\d+)/)?.[1] ?? -1);
  const session = await fetchSession(page);
  assert.equal(evictedKeys, 0);
  assert.equal(session.status, 200);
  assert.equal(session.body?.authenticated, true);
  report.observations.valkeyMemoryPressure = {
    fillerKeysCreated,
    allocationRejected,
    evictedKeys,
    existingSessionPreserved: true,
  };
  await run("docker", [
    "exec", "--env", "VALKEYCLI_AUTH", valkeyName,
    "valkey-cli", "--user", "phase2-admin", "--no-auth-warning", "flushdb",
  ], { env: environment });
  await context.close();
  report.checks.valkeyNoEvictionUnderPressure = "pass";
}

async function valkeyAnonymousIndependenceCheck() {
  await run("docker", ["pause", valkeyName]);
  await anonymousChecks();
  await run("docker", ["unpause", valkeyName]);
  report.checks.anonymousWhileValkeyDown = "pass";
}

async function valkeyStartupUnavailableCheck() {
  await stopQuarkus();
  await run("docker", ["stop", "--time", "10", valkeyName]);
  try {
    await startQuarkus({}, 20_000);
    await anonymousChecks();
    report.checks.startupWithoutValkey = "pass";
  } catch (error) {
    report.checks.startupWithoutValkey = "fail";
    report.observations.startupWithoutValkey = redact(error.message);
  } finally {
    await stopQuarkus();
    await run("docker", ["start", valkeyName]);
    await waitForValkey();
    await startQuarkus();
  }
}

async function finalLeakScan() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observePage(page);
  await page.goto(`${urls.app}auth-probe.html`);
  await page.locator(".status-anonymous").waitFor();
  const state = await browserState(page);
  const scan = scanForLeaks(state);
  assert.deepEqual(scan.leaks, []);
  assert.equal(scan.jwtShapedBrowserReadableValue, false);
  const keycloakLogs = await run("docker", ["logs", keycloakName]);
  const combinedKeycloakLogs = `${keycloakLogs.stdout}\n${keycloakLogs.stderr}`;
  const accessOrRefreshInKeycloakLogs = [...keycloakRelay.accessTokens, ...keycloakRelay.refreshTokens]
    .some((token) => combinedKeycloakLogs.includes(token));
  assert.equal(accessOrRefreshInKeycloakLogs, false);
  report.observations.finalLeakScan = {
    ...scan,
    keycloakLogsContainAccessOrRefreshToken: false,
    quarkusLogsContainIdToken: [...keycloakRelay.idTokens].some((token) => quarkusLogs.join("").includes(token)),
  };
  await context.close();
  report.checks.finalLeakScan = "pass";
}

async function runExperiment() {
  await mkdir(temporaryDirectory, { recursive: true, mode: 0o700 });
  await mkdir(reportDirectory, { recursive: true });
  await assertPortsFree();
  report.provenance = await captureProvenance();

  const libraries = await readdir(path.join(root, "target/quarkus-app/lib/main"));
  const hasValkeyManager = libraries.some((name) => name.includes("oidc-redis-token-state-manager"));
  assert.equal(hasValkeyManager, mode === "valkey", `The built artifact does not match ${mode} mode`);

  const tls = await createCertificate();
  await startKeycloakRelay(tls);
  await startApplicationProxy(tls);
  await startKeycloak();
  if (mode === "valkey") {
    await startValkey();
    report.observations.valkeyConfiguration = await valkeyMetadata();
  }
  await startQuarkus();
  browser = await chromium.launch();

  await anonymousChecks();
  await keycloakRuntimeOutageCheck();
  await startupWithoutKeycloakCheck();
  if (mode === "valkey") {
    await valkeyAnonymousIndependenceCheck();
    await valkeyStartupUnavailableCheck();
  }

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await login(context);
  await measureAuthenticatedSession(context, page, "combinedTokenState");
  report.measurements.authenticatedRequestOverhead = await measureSessionRequestOverhead(page);
  if (mode === "valkey") report.measurements.encryptedValkeyState = await inspectValkeyState();
  await validSessionKeycloakOutageCheck(context, page);
  await stableRestartCheck(page);
  const state = await browserState(page);
  const leakScan = scanForLeaks(state);
  assert.deepEqual(leakScan.leaks, []);
  assert.equal(leakScan.jwtShapedBrowserReadableValue, false);
  assert.deepEqual(state.localStorage, []);
  assert.deepEqual(state.sessionStorage, []);
  assert.deepEqual(state.indexedDatabases, []);
  assert.deepEqual(state.serviceWorkers, []);
  report.observations.leakScan = leakScan;
  report.checks.browserLeakage = "pass";

  await localLogoutAndRevocabilityCheck(context, page);
  await context.close();
  await csrfCheck();
  await tamperedSessionCookieCheck();
  await changedEncryptionSecretCheck();
  await flowIntegrityChecks();
  await staleCookieCheck();
  await refreshWhileKeycloakDownCheck();
  await parallelRefreshCheck({
    refreshCacheTtl: "0S",
    waitMilliseconds: 11_000,
    label: "parallelProactiveRefresh-cacheDisabled",
    expectCoalesced: false,
  });
  await parallelRefreshCheck({
    refreshCacheTtl: "5S",
    waitMilliseconds: 11_000,
    label: "parallelProactiveRefresh-cacheEnabled",
    expectCoalesced: true,
  });
  await parallelRefreshCheck({
    refreshCacheTtl: "0S",
    waitMilliseconds: 16_500,
    label: "parallelExpiredRefresh-cacheDisabled",
    expectCoalesced: false,
  });
  await parallelRefreshCheck({
    refreshCacheTtl: "5S",
    waitMilliseconds: 16_500,
    label: "parallelExpiredRefresh-cacheEnabled",
    expectCoalesced: true,
  });
  await rpLogoutCheck();
  await formPostLogoutCheck();

  if (mode === "stateless") {
    await stopQuarkus();
    await startQuarkus({ splitTokens: true });
    const splitContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const splitPage = await login(splitContext);
    await measureAuthenticatedSession(splitContext, splitPage, "explicitSplitTokenState");
    await splitContext.close();
  } else {
    await valkeyMemoryPressureCheck();
    await missingValkeyStateCheck();
    await valkeyOutageCheck();
    await valkeyRestartCheck();
  }

  await finalLeakScan();
  report.measurements.setCookieHeaders = setCookieMeasurements();
  report.finishedAt = new Date().toISOString();
  const failedChecks = Object.entries(report.checks)
    .filter(([, result]) => result.startsWith("fail"))
    .map(([name, result]) => `${name}:${result}`);
  if (failedChecks.length > 0) {
    report.result = "fail";
    report.failure = `Phase 2 mode failed required checks: ${failedChecks.join(", ")}`;
    process.exitCode = 1;
  } else {
    report.result = "pass";
  }
}

async function cleanup() {
  if (browser) await browser.close().catch(() => {});
  await stopQuarkus().catch(() => {});
  if (appProxy) await new Promise((resolve) => appProxy.close(resolve));
  if (keycloakProxy) await new Promise((resolve) => keycloakProxy.close(resolve));
  await run("docker", ["rm", "--force", keycloakName], { allowFailure: true }).catch(() => {});
  await run("docker", ["rm", "--force", valkeyName], { allowFailure: true }).catch(() => {});
  await rm(temporaryDirectory, { recursive: true, force: true });
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
  console.log(`${mode} Phase 2 evidence: ${reportPath}`);
  console.log(`result=${report.result}`);
  if (report.failure) console.error(report.failure);
}
