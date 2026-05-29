const imageGenerationCore = require("./image-generation-settings-core.cjs");
const providerSettings = require("./ai-provider-settings.cjs");
const recognitionRules = require("./section-template-recognition.cjs");

const AI_SETTINGS_TEST_TARGETS = {
  imageGeneration: "imageGeneration",
  sectionTemplateRecognition: "sectionTemplateRecognition"
};

const {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  cleanEnvValue,
  firstCleanEnvValue,
  getProviderApiKey,
  getProviderBaseUrl,
  maskSecret,
  normalizeAiProvider,
  readEnabledFlag
} = providerSettings;

function getImageGenerationSettings(env = process.env) {
  const providerKey = normalizeAiProvider(env.AI_IMAGE_PROVIDER);
  const defaultSize = imageGenerationCore.normalizeImageSize(
    firstCleanEnvValue(env.AI_IMAGE_DEFAULT_SIZE, env.OPENAI_IMAGE_DEFAULT_SIZE),
    "1024x1024"
  );
  const defaultQuality = imageGenerationCore.normalizeImageQuality(
    firstCleanEnvValue(env.AI_IMAGE_DEFAULT_QUALITY, env.OPENAI_IMAGE_DEFAULT_QUALITY),
    "auto"
  );
  const outputFormat = imageGenerationCore.normalizeImageOutputFormat(
    firstCleanEnvValue(env.AI_IMAGE_OUTPUT_FORMAT, env.OPENAI_IMAGE_OUTPUT_FORMAT),
    "webp"
  );
  const model = providerKey === AI_PROVIDERS.siliconflow
    ? cleanEnvValue(env.SILICONFLOW_IMAGE_MODEL)
    : cleanEnvValue(env.OPENAI_IMAGE_MODEL);
  const apiKey = getProviderApiKey(env, providerKey);
  const enabled = readEnabledFlag(env, [
    "AI_IMAGE_ENABLED",
    providerKey === AI_PROVIDERS.siliconflow ? "SILICONFLOW_IMAGE_ENABLED" : "OPENAI_IMAGE_ENABLED",
    "OPENAI_IMAGE_ENABLED"
  ], true);

  return {
    providerKey,
    provider: AI_PROVIDER_LABELS[providerKey],
    baseUrl: getProviderBaseUrl(env, providerKey),
    enabled,
    hasApiKey: Boolean(apiKey),
    model,
    modelIds: model ? [model] : [],
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
  const apiKey = getProviderApiKey(env, settings.providerKey);

  return {
    providerKey: settings.providerKey,
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    enabled: settings.enabled,
    hasApiKey: settings.hasApiKey,
    model: settings.model,
    modelIds: settings.modelIds || (settings.model ? [settings.model] : []),
    visionModel: settings.visionModel || "",
    textModel: settings.textModel || "",
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
