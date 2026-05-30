import crypto from "node:crypto";
import { getPostgresPool } from "@/lib/db";
import aiServiceSettings from "@/lib/ai-service-settings.cjs";

const ENVIRONMENT_KEYS = new Set(["production", "preview", "development"]);
const SECRET_KEYS = ["OPENAI_API_KEY", "SILICONFLOW_API_KEY"];
const CONFIG_KEYS = [
  "AI_IMAGE_PROVIDER",
  "AI_IMAGE_ENABLED",
  "AI_IMAGE_DEFAULT_SIZE",
  "AI_IMAGE_DEFAULT_QUALITY",
  "AI_IMAGE_OUTPUT_FORMAT",
  "AI_SECTION_TEMPLATE_PROVIDER",
  "AI_SECTION_TEMPLATE_ENABLED",
  "AI_SECTION_TEMPLATE_TIMEOUT_MS",
  "AI_SECTION_TEMPLATE_UAT_MODE",
  "OPENAI_BASE_URL",
  "OPENAI_IMAGE_ENABLED",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_IMAGE_OUTPUT_FORMAT",
  "OPENAI_IMAGE_DEFAULT_SIZE",
  "OPENAI_IMAGE_DEFAULT_QUALITY",
  "OPENAI_SECTION_TEMPLATE_ENABLED",
  "OPENAI_SECTION_TEMPLATE_MODEL",
  "OPENAI_SECTION_TEMPLATE_TIMEOUT_MS",
  "OPENAI_SECTION_TEMPLATE_UAT_MODE",
  "SILICONFLOW_BASE_URL",
  "SILICONFLOW_IMAGE_MODEL",
  "SILICONFLOW_VISION_MODEL",
  "SILICONFLOW_TEXT_MODEL",
  "SILICONFLOW_TIMEOUT_MS"
];

function clean(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

export function getCurrentAiSettingsEnvironment(env = process.env) {
  const explicit = clean(env.AI_SETTINGS_ENVIRONMENT).toLowerCase();
  if (ENVIRONMENT_KEYS.has(explicit)) return explicit;
  const vercelEnv = clean(env.VERCEL_ENV).toLowerCase();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "development";
}

function encryptionKey(env = process.env) {
  const material = clean(env.AI_SETTINGS_ENCRYPTION_KEY, 2000) || clean(env.SUPABASE_SERVICE_ROLE_KEY, 2000);
  if (!material) return null;
  return crypto.createHash("sha256").update(material).digest();
}

function encryptSecret(value, env = process.env) {
  const secret = clean(value, 4000);
  if (!secret) return null;
  const key = encryptionKey(env);
  if (!key) throw new Error("AI settings encryption key is not configured.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    value: encrypted.toString("base64"),
    preview: aiServiceSettings.maskSecret(secret)
  };
}

function decryptSecret(payload, env = process.env) {
  if (!payload || typeof payload !== "object") return "";
  const key = encryptionKey(env);
  if (!key) return "";
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv || "", "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag || "", "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.value || "", "base64")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

function isMissingTableError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.code === "42P01" || message.includes("ai_service_settings") || message.includes("supabase_db_pool_url");
}

function normalizeBool(value, fallback = true) {
  if (value === true) return "true";
  if (value === false) return "false";
  const normalized = clean(value).toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return "true";
  if (["false", "0", "no", "off"].includes(normalized)) return "false";
  return fallback ? "true" : "false";
}

function normalizeProvider(value) {
  return clean(value).toLowerCase() === "siliconflow" ? "siliconflow" : "openai";
}

function normalizeConfig(input = {}) {
  const imageProvider = normalizeProvider(input.AI_IMAGE_PROVIDER || input.imageProvider);
  const recognitionProvider = normalizeProvider(input.AI_SECTION_TEMPLATE_PROVIDER || input.recognitionProvider);
  const config = {
    AI_IMAGE_PROVIDER: imageProvider,
    AI_IMAGE_ENABLED: normalizeBool(input.AI_IMAGE_ENABLED ?? input.imageEnabled, true),
    AI_IMAGE_DEFAULT_SIZE: clean(input.AI_IMAGE_DEFAULT_SIZE || input.defaultSize || "1024x1024", 32),
    AI_IMAGE_DEFAULT_QUALITY: clean(input.AI_IMAGE_DEFAULT_QUALITY || input.defaultQuality || "auto", 32),
    AI_IMAGE_OUTPUT_FORMAT: clean(input.AI_IMAGE_OUTPUT_FORMAT || input.outputFormat || "webp", 32),
    AI_SECTION_TEMPLATE_PROVIDER: recognitionProvider,
    AI_SECTION_TEMPLATE_ENABLED: normalizeBool(input.AI_SECTION_TEMPLATE_ENABLED ?? input.recognitionEnabled, true),
    AI_SECTION_TEMPLATE_TIMEOUT_MS: clean(input.AI_SECTION_TEMPLATE_TIMEOUT_MS || input.recognitionTimeoutMs || "240000", 32),
    AI_SECTION_TEMPLATE_UAT_MODE: normalizeBool(input.AI_SECTION_TEMPLATE_UAT_MODE ?? input.uatMode, false),
    OPENAI_BASE_URL: clean(input.OPENAI_BASE_URL || input.openAiBaseUrl || "https://api.openai.com/v1", 240),
    OPENAI_IMAGE_ENABLED: normalizeBool(input.OPENAI_IMAGE_ENABLED ?? input.openAiImageEnabled, true),
    OPENAI_IMAGE_MODEL: clean(input.OPENAI_IMAGE_MODEL || input.openAiImageModel, 240),
    OPENAI_IMAGE_OUTPUT_FORMAT: clean(input.OPENAI_IMAGE_OUTPUT_FORMAT || input.outputFormat || "webp", 32),
    OPENAI_IMAGE_DEFAULT_SIZE: clean(input.OPENAI_IMAGE_DEFAULT_SIZE || input.defaultSize || "1024x1024", 32),
    OPENAI_IMAGE_DEFAULT_QUALITY: clean(input.OPENAI_IMAGE_DEFAULT_QUALITY || input.defaultQuality || "auto", 32),
    OPENAI_SECTION_TEMPLATE_ENABLED: normalizeBool(input.OPENAI_SECTION_TEMPLATE_ENABLED ?? input.openAiRecognitionEnabled, true),
    OPENAI_SECTION_TEMPLATE_MODEL: clean(input.OPENAI_SECTION_TEMPLATE_MODEL || input.openAiRecognitionModel, 240),
    OPENAI_SECTION_TEMPLATE_TIMEOUT_MS: clean(input.OPENAI_SECTION_TEMPLATE_TIMEOUT_MS || input.recognitionTimeoutMs || "120000", 32),
    OPENAI_SECTION_TEMPLATE_UAT_MODE: normalizeBool(input.OPENAI_SECTION_TEMPLATE_UAT_MODE ?? input.uatMode, false),
    SILICONFLOW_BASE_URL: clean(input.SILICONFLOW_BASE_URL || input.siliconFlowBaseUrl || "https://api.siliconflow.cn/v1", 240),
    SILICONFLOW_IMAGE_MODEL: clean(input.SILICONFLOW_IMAGE_MODEL || input.siliconFlowImageModel, 240),
    SILICONFLOW_VISION_MODEL: clean(input.SILICONFLOW_VISION_MODEL || input.siliconFlowVisionModel, 240),
    SILICONFLOW_TEXT_MODEL: clean(input.SILICONFLOW_TEXT_MODEL || input.siliconFlowTextModel, 240),
    SILICONFLOW_TIMEOUT_MS: clean(input.SILICONFLOW_TIMEOUT_MS || input.recognitionTimeoutMs || "240000", 32)
  };

  return Object.fromEntries(CONFIG_KEYS.map((key) => [key, config[key] || ""]));
}

function mergeConfigWithEnv(config = {}, secrets = {}, env = process.env) {
  const nextEnv = { ...env };
  for (const key of CONFIG_KEYS) {
    if (config[key] !== undefined && config[key] !== null && String(config[key]).trim() !== "") {
      nextEnv[key] = String(config[key]);
    }
  }
  for (const key of SECRET_KEYS) {
    const value = decryptSecret(secrets[key], env);
    if (value) nextEnv[key] = value;
  }
  return nextEnv;
}

function previewFromSecrets(secrets = {}) {
  return Object.fromEntries(SECRET_KEYS.map((key) => [key, clean(secrets[key]?.preview)]));
}

export async function readAiServiceSettingsRecord(environmentKey = getCurrentAiSettingsEnvironment()) {
  const normalizedEnvironment = ENVIRONMENT_KEYS.has(environmentKey) ? environmentKey : "development";
  try {
    const result = await getPostgresPool().query(
      `select *
       from public.ai_service_settings
       where environment_key = $1
       limit 1`,
      [normalizedEnvironment]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function getAiServiceSettingsFromStore(options = {}) {
  const environmentKey = getCurrentAiSettingsEnvironment();
  const record = await readAiServiceSettingsRecord(environmentKey);
  const env = record
    ? mergeConfigWithEnv(record.config || {}, record.encrypted_secrets || {})
    : process.env;
  const settings = aiServiceSettings.getAiServiceSettings(env, options);
  const source = record ? "database" : "environment";
  return {
    ...settings,
    environmentKey,
    source,
    updatedAt: record?.updated_at ? new Date(record.updated_at).toISOString() : null,
    secretPreviews: record ? previewFromSecrets(record.encrypted_secrets || {}) : {}
  };
}

export async function getImageGenerationSettingsFromStore(options = {}) {
  return (await getAiServiceSettingsFromStore(options)).imageGeneration;
}

export async function getSectionTemplateRecognitionSettingsFromStore(options = {}) {
  return (await getAiServiceSettingsFromStore(options)).sectionTemplateRecognition;
}

export async function saveAiServiceSettings(adminUser, input = {}) {
  const environmentKey = getCurrentAiSettingsEnvironment();
  const current = await readAiServiceSettingsRecord(environmentKey);
  const nextConfig = normalizeConfig({ ...(current?.config || {}), ...(input.config || input) });
  const nextSecrets = { ...(current?.encrypted_secrets || {}) };

  for (const key of SECRET_KEYS) {
    const clearKey = input.clearSecrets?.includes?.(key) || input[`clear_${key}`] === true;
    const nextSecret = input.secrets?.[key] ?? input[key];
    if (clearKey) {
      delete nextSecrets[key];
    } else if (clean(nextSecret, 4000)) {
      nextSecrets[key] = encryptSecret(nextSecret);
    }
  }

  const result = await getPostgresPool().query(
    `insert into public.ai_service_settings (environment_key, config, encrypted_secrets, updated_by)
     values ($1, $2::jsonb, $3::jsonb, $4)
     on conflict (environment_key)
     do update set config = excluded.config,
                   encrypted_secrets = excluded.encrypted_secrets,
                   updated_by = excluded.updated_by,
                   updated_at = now()
     returning *`,
    [
      environmentKey,
      JSON.stringify(nextConfig),
      JSON.stringify(nextSecrets),
      adminUser?.id || null
    ]
  );

  return result.rows[0];
}

export function buildAiSettingsEditDraft(settings = {}) {
  const image = settings.imageGeneration || {};
  const recognition = settings.sectionTemplateRecognition || {};
  return {
    AI_IMAGE_PROVIDER: image.providerKey || "openai",
    AI_IMAGE_ENABLED: image.enabled ? "true" : "false",
    AI_IMAGE_DEFAULT_SIZE: image.defaultSize || "1024x1024",
    AI_IMAGE_DEFAULT_QUALITY: image.defaultQuality || "auto",
    AI_IMAGE_OUTPUT_FORMAT: image.outputFormat || "webp",
    AI_SECTION_TEMPLATE_PROVIDER: recognition.providerKey || "openai",
    AI_SECTION_TEMPLATE_ENABLED: recognition.enabled ? "true" : "false",
    AI_SECTION_TEMPLATE_TIMEOUT_MS: String(recognition.timeoutMs || 240000),
    AI_SECTION_TEMPLATE_UAT_MODE: recognition.uatModeRequested ? "true" : "false",
    OPENAI_BASE_URL: image.providerKey === "openai" ? image.baseUrl : "https://api.openai.com/v1",
    OPENAI_IMAGE_MODEL: image.providerKey === "openai" ? image.model : "",
    OPENAI_SECTION_TEMPLATE_MODEL: recognition.providerKey === "openai" ? recognition.model : "",
    SILICONFLOW_BASE_URL: image.providerKey === "siliconflow" ? image.baseUrl : recognition.baseUrl,
    SILICONFLOW_IMAGE_MODEL: image.providerKey === "siliconflow" ? image.model : "",
    SILICONFLOW_VISION_MODEL: recognition.visionModel || "",
    SILICONFLOW_TEXT_MODEL: recognition.textModel || "",
    SILICONFLOW_TIMEOUT_MS: String(recognition.timeoutMs || 240000)
  };
}
