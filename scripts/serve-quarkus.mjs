import http from "node:http";
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const externalHost = "127.0.0.1";
const externalPort = 50722;
const internalHost = "127.0.0.1";
const internalPort = 50723;
const jar = fileURLToPath(new URL("../target/quarkus-app/quarkus-run.jar", import.meta.url));

const quarkus = spawn(
  "java",
  [
    `-Dquarkus.http.host=${internalHost}`,
    `-Dquarkus.http.port=${internalPort}`,
    "-jar",
    jar,
  ],
  { stdio: "inherit" },
);

const proxy = http.createServer((request, response) => {
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

  const headers = { ...request.headers };
  for (const name of Object.keys(headers)) {
    if (name === "forwarded" || name.startsWith("x-forwarded-")) delete headers[name];
  }
  delete headers.connection;
  delete headers["content-length"];
  headers.host = `${internalHost}:${internalPort}`;
  headers["x-forwarded-host"] = request.headers.host ?? `${externalHost}:${externalPort}`;
  headers["x-forwarded-prefix"] = "/search/";
  headers["x-forwarded-proto"] = "http";

  const upstream = http.request(
    {
      host: internalHost,
      port: internalPort,
      method: request.method,
      path: `/${rawPath.slice("/search/".length)}${rawQuery}`,
      headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.on("error", (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    response.end(`Quarkus unavailable: ${error.message}`);
  });
  request.pipe(upstream);
});

proxy.listen(externalPort, externalHost, () => {
  console.log(`Prefix-strip test server listening on http://${externalHost}:${externalPort}/search/`);
});

let stopping = false;
function stop(signal) {
  if (stopping) {
    return;
  }
  stopping = true;
  if (proxy.listening) {
    proxy.close();
  }
  if (quarkus.exitCode === null && quarkus.signalCode === null) {
    quarkus.kill(signal);
  }
}

proxy.on("error", (error) => {
  console.error(`Prefix-strip test server failed: ${error.message}`);
  stop("SIGTERM");
});

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

quarkus.on("exit", (code, signal) => {
  proxy.close(() => process.exit(code ?? (signal && !stopping ? 1 : 0)));
});
