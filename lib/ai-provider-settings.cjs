const AI_PROVIDERS = {
  openai: "openai",
  siliconflow: "siliconflow"
};

const AI_PROVIDER_LABELS = {
  [AI_PROVIDERS.openai]: "OpenAI",
  [AI_PROVIDERS.siliconflow]: "SiliconFlow"
};

const DEFAULT_PROVIDER = AI_PROVIDERS.openai;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";

function cleanEnvValue(value) {
  const normalized = String(value || "").trim();
  if (normalized === "\"\"" || normalized === "''") return "";
  return normalized;
}

function firstCleanEnvValue(...values) {
  for (const value of values) {
    const cleaned = cleanEnvValue(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function maskSecret(value = "") {
  const secret = cleanEnvValue(value);
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 3)}************${secret.slice(-4)}`;
}

function normalizeAiProvider(value, fallback = DEFAULT_PROVIDER) {
  const normalized = cleanEnvValue(value).toLowerCase();
  if (Object.values(AI_PROVIDERS).includes(normalized)) return normalized;
  return Object.values(AI_PROVIDERS).includes(fallback) ? fallback : DEFAULT_PROVIDER;
}

function normalizeBaseUrl(value, fallback) {
  const normalized = cleanEnvValue(value) || fallback;
  return normalized.replace(/\/+$/, "");
}

function readEnabledFlag(env, keys, fallback = true) {
  for (const key of keys) {
    if (!key || !Object.prototype.hasOwnProperty.call(env, key)) continue;
    const value = cleanEnvValue(env[key]).toLowerCase();
    if (!value) continue;
    return !["0", "false", "no", "off"].includes(value);
  }
  return fallback;
}

function getProviderApiKey(env = process.env, providerKey = DEFAULT_PROVIDER) {
  if (providerKey === AI_PROVIDERS.siliconflow) return cleanEnvValue(env.SILICONFLOW_API_KEY);
  return cleanEnvValue(env.OPENAI_API_KEY);
}

function getProviderBaseUrl(env = process.env, providerKey = DEFAULT_PROVIDER) {
  if (providerKey === AI_PROVIDERS.siliconflow) {
    return normalizeBaseUrl(env.SILICONFLOW_BASE_URL, DEFAULT_SILICONFLOW_BASE_URL);
  }
  return normalizeBaseUrl(env.OPENAI_BASE_URL, DEFAULT_OPENAI_BASE_URL);
}

module.exports = {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_PROVIDER,
  DEFAULT_SILICONFLOW_BASE_URL,
  cleanEnvValue,
  firstCleanEnvValue,
  getProviderApiKey,
  getProviderBaseUrl,
  maskSecret,
  normalizeAiProvider,
  normalizeBaseUrl,
  readEnabledFlag
};
