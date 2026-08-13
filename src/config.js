const DEFAULT_CONFIG = {
  apiBaseUrl: "https://api.ramanchada.ideaconsult.net/",
  ambitUrl: "https://apps.ideaconsult.net/nanoreg1/",
  predictionsCore: "vega",
  chemicalsCore: "dsstox",
  subjectField: "dsstox_id_s",
  hsdsUrl: "https://hsds.adma.ai",
  hsdsDomain: "/qubounds",
};

let runtimeConfig = normalizeConfig(DEFAULT_CONFIG);

function ensureTrailingSlash(value) {
  if (!value) return value;
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeConfig(config) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  return {
    ...merged,
    apiBaseUrl: ensureTrailingSlash(String(merged.apiBaseUrl || "")),
    ambitUrl: ensureTrailingSlash(String(merged.ambitUrl || "")),
  };
}

function validateUrl(config, key, required = false) {
  const value = config[key];
  if (value == null || value === "") {
    if (required) throw new Error(`Runtime config is missing ${key}`);
    return;
  }
  if (typeof value !== "string") {
    throw new Error(`Runtime config ${key} must be a string`);
  }
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Runtime config ${key} must use HTTP or HTTPS`);
  }
}

function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Runtime config must be a JSON object");
  }

  validateUrl(config, "apiBaseUrl", true);
  validateUrl(config, "ambitUrl");
  validateUrl(config, "hsdsUrl");

  for (const key of [
    "predictionsCore",
    "chemicalsCore",
    "subjectField",
    "hsdsDomain",
  ]) {
    if (config[key] != null && typeof config[key] !== "string") {
      throw new Error(`Runtime config ${key} must be a string`);
    }
  }
}

export async function loadRuntimeConfig() {
  const response = await fetch(`${import.meta.env.BASE_URL}config.json`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load runtime config: HTTP ${response.status}`);
  }

  const loadedConfig = await response.json();
  validateConfig(loadedConfig);
  runtimeConfig = normalizeConfig(loadedConfig);
  return runtimeConfig;
}

export function getRuntimeConfig() {
  return runtimeConfig;
}

export function apiUrl(path) {
  return new URL(path, getRuntimeConfig().apiBaseUrl).toString();
}
