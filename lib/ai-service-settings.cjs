const imageGenerationCore = require("./image-generation-settings-core.cjs");
const recognitionRules = require("./section-template-recognition.cjs");

const AI_SETTINGS_TEST_TARGETS = {
  imageGeneration: "imageGeneration",
  sectionTemplateRecognition: "sectionTemplateRecognition"
};

function cleanEnvValue(value) {
  const normalized = String(value || "").trim();
  if (normalized === "\"\"" || normalized === "''") return "";
  return normalized;
}

function maskSecret(value = "") {
  const secret = cleanEnvValue(value);
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 3)}************${secret.slice(-4)}`;
}

function getImageGenerationSettings(env = process.env) {
  const defaultSize = imageGenerationCore.normalizeImageSize(env.OPENAI_IMAGE_DEFAULT_SIZE, "1024x1024");
  const defaultQuality = imageGenerationCore.normalizeImageQuality(env.OPENAI_IMAGE_DEFAULT_QUALITY, "auto");
  const outputFormat = imageGenerationCore.normalizeImageOutputFormat(env.OPENAI_IMAGE_OUTPUT_FORMAT, "webp");
  const model = cleanEnvValue(env.OPENAI_IMAGE_MODEL);
  const apiKey = cleanEnvValue(env.OPENAI_API_KEY);
  const enabled = cleanEnvValue(env.OPENAI_IMAGE_ENABLED).toLowerCase() !== "false";

  return {
    provider: "OpenAI",
    enabled,
    hasApiKey: Boolean(apiKey),
    model,
    configured: enabled && Boolean(apiKey) && Boolean(model),
    defaultSize,
    defaultQuality,
    outputFormat,
    supportedSizes: imageGenerationCore.SUPPORTED_IMAGE_SIZES,
    supportedQualities: imageGenerationCore.SUPPORTED_IMAGE_QUALITIES,
    supportedOutputFormats: imageGenerationCore.SUPPORTED_IMAGE_OUTPUT_FORMATS,
    apiKeyPreview: apiKey ? maskSecret(apiKey) : ""
  };
}

function getSectionTemplateRecognitionServiceSettings(env = process.env) {
  const settings = recognitionRules.getSectionTemplateRecognitionSettings(env);
  const apiKey = cleanEnvValue(env.OPENAI_API_KEY);

  return {
    provider: settings.provider,
    enabled: settings.enabled,
    hasApiKey: settings.hasApiKey,
    model: settings.model,
    configured: settings.configured,
    timeoutMs: settings.timeoutMs,
    uatModeRequested: settings.uatModeRequested,
    uatModeAvailable: settings.uatModeAvailable,
    uatModeEnabled: settings.uatModeEnabled,
    apiKeyPreview: apiKey ? maskSecret(apiKey) : ""
  };
}

function getAiServiceSettings(env = process.env) {
  return {
    imageGeneration: getImageGenerationSettings(env),
    sectionTemplateRecognition: getSectionTemplateRecognitionServiceSettings(env)
  };
}

function normalizeAiSettingsTestTarget(value) {
  const normalized = cleanEnvValue(value);
  return normalized === AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition
    ? AI_SETTINGS_TEST_TARGETS.sectionTemplateRecognition
    : AI_SETTINGS_TEST_TARGETS.imageGeneration;
}

module.exports = {
  AI_SETTINGS_TEST_TARGETS,
  cleanEnvValue,
  getAiServiceSettings,
  getImageGenerationSettings,
  getSectionTemplateRecognitionServiceSettings,
  maskSecret,
  normalizeAiSettingsTestTarget
};
