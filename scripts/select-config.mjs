import { copyFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "public/config.json");
const argument = process.argv[2];
const ensureOnly = argument === "--ensure";
const requested = ensureOnly || !argument ? "spectra.json" : argument;
const configName = requested.endsWith(".json") ? requested : `${requested}.json`;

if (
  !/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(configName) ||
  configName.includes("..")
) {
  throw new Error(`Invalid config name: ${requested}`);
}

async function validateConfig(path) {
  const config = JSON.parse(await readFile(path, "utf8"));
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`${path} must contain a JSON object`);
  }
  if (typeof config.apiBaseUrl !== "string" || !config.apiBaseUrl) {
    throw new Error(`${path} is missing apiBaseUrl`);
  }
  return config;
}

if (ensureOnly) {
  try {
    await validateConfig(target);
    console.log("Using existing public/config.json");
    process.exit(0);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const source = resolve(root, "public/configs", configName);
await validateConfig(source);
await copyFile(source, target);
console.log(`Selected frontend config: ${configName}`);
