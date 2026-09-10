import http from "node:http";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const appMarker = '<div id="root"></div>';
const routeContract = JSON.parse(
  readFileSync(new URL("../../src/route-contract.json", import.meta.url), "utf8"),
);

function rawGet(path) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port: 50722,
        path,
        headers: { accept: "text/html" },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("error", reject);
    request.end();
  });
}

test("preserves the external prefix contract and resource headers", async ({ request }) => {
  const bare = await request.get("/search", { maxRedirects: 0 });
  expect(bare.status()).toBe(301);
  expect(bare.headers().location).toBe("/search/");

  const bareWithQuery = await rawGet("/search?source=phase1");
  expect(bareWithQuery.status).toBe(301);
  expect(bareWithQuery.headers.location).toBe("/search/?source=phase1");

  const root = await request.get("/search/", { headers: { accept: "text/html" } });
  expect(root.status()).toBe(200);
  expect(root.headers()["cache-control"]).toBe("no-cache");
  const index = await root.text();
  expect(index).toContain(appMarker);

  const assetPath = index.match(/\/search\/(assets\/[^"']+\.(?:js|css))/)?.[1];
  expect(assetPath).toBeTruthy();
  const asset = await request.get(`/search/${assetPath}`);
  expect(asset.status()).toBe(200);
  expect(asset.headers()["cache-control"]).toBe("public,max-age=31536000,immutable");

  const config = await request.get("/search/config.json");
  expect(config.status()).toBe(200);
  expect(config.headers()["content-type"]).toContain("application/json");
  expect(config.headers()["cache-control"]).toBe("no-store");

  const health = await request.get("/search/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toEqual({ status: "UP" });

  for (const path of [
    "/search/unknown",
    "/search/api/future",
    "/search/assets/missing.js",
    "/search/missing.css",
  ]) {
    const response = await request.get(path, { headers: { accept: "text/html" } });
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain(appMarker);
  }
});

test("serves every declared frontend route through the external prefix", async ({ request }) => {
  for (const route of routeContract) {
    expect(route.shellExamples.length, `${route.id} must have a shell example`).toBeGreaterThan(0);
    for (const path of route.shellExamples) {
      const response = await request.get(`/search${path}`, { headers: { accept: "text/html" } });
      expect(response.status(), `${route.id}: ${path}`).toBe(200);
      expect(await response.text()).toContain(appMarker);
    }
  }
});

test("preserves malformed raw paths for Quarkus rejection", async () => {
  for (const path of [
    "/search/hits/example/../missing",
    "/search/hits/example/%2e%2e/missing",
    "/search/hits/example/.%2e/missing",
    "/search/hits/example/%2e./missing",
    "/search/hits/example/%2f%2e%2e%2fmissing",
  ]) {
    const response = await rawGet(path);
    expect(response.status, path).toBeGreaterThanOrEqual(400);
    expect(response.status, path).toBeLessThan(500);
    expect(response.body).not.toContain(appMarker);
  }
});

test("loads browser-visible route shells without external network access", async ({ browser }) => {
  for (const route of ["/search/", "/search/Imports", "/search/h5web/example.h5/group"]) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    const externalRequests = [];

    await page.route("**/*", async (requestRoute) => {
      const url = new URL(requestRoute.request().url());
      if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
        await requestRoute.continue();
        return;
      }
      externalRequests.push(url.href);
      await requestRoute.abort("blockedbyclient");
    });

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.locator('script[src^="/search/assets/"]')).toHaveCount(1);
    expect(externalRequests.length).toBeGreaterThan(0);
    expect(externalRequests.every((url) => !url.startsWith("http://127.0.0.1"))).toBe(true);
    await context.close();
  }
});
