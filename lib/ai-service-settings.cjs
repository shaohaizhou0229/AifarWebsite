const imageGenerationCore = require("./image-generation-settings-core.cjs");
const providerSettings = require("./ai-provider-settings.cjs");
const recognitionRules = require("./section-template-recognition.cjs");

const AI_SETTINGS_TEST_TARGETS = {
  imageGeneration: "imageGeneration",
  sectionTemplateRecognition: "sectionTemplateRecognition"
};

const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
const DEFAULT_OPENAI_SECTION_TEMPLATE_MODEL = recognitionRules.DEFAULT_MODEL;

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

function getImageGenerationSettings(env = process.env, options = {}) {
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
    : firstCleanEnvValue(env.AI_IMAGE_MODEL, env.OPENAI_IMAGE_MODEL) || DEFAULT_OPENAI_IMAGE_MODEL;
  const apiKey = getProviderApiKey(env, providerKey);
  const enabled = readEnabledFlag(env, [
    "AI_IMAGE_ENABLED",
    providerKey === AI_PROVIDERS.siliconflow ? "SILICONFLOW_IMAGE_ENABLED" : "OPENAI_IMAGE_ENABLED",
    "OPENAI_IMAGE_ENABLED"
  ], true);

  const settings = {
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
  if (options.includeSecret) settings.apiKey = apiKey;
  return settings;
}

function getSectionTemplateRecognitionServiceSettings(env = process.env, options = {}) {
  const settings = recognitionRules.getSectionTemplateRecognitionSettings(env);
  const apiKey = getProviderApiKey(env, settings.providerKey);

  const serviceSettings = {
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
  if (options.includeSecret) serviceSettings.apiKey = apiKey;
  return serviceSettings;
}

function getAiServiceSettings(env = process.env, options = {}) {
  return {
    imageGeneration: getImageGenerationSettings(env, options),
    sectionTemplateRecognition: getSectionTemplateRecognitionServiceSettings(env, options)
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
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_SECTION_TEMPLATE_MODEL,
  cleanEnvValue,
  getAiServiceSettings,
  getImageGenerationSettings,
  getSectionTemplateRecognitionServiceSettings,
  maskSecret,
  normalizeAiSettingsTestTarget
};
