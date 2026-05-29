import imageGenerationCore from "./image-generation-settings-core.cjs";
import aiServiceSettings from "./ai-service-settings.cjs";

export const SUPPORTED_IMAGE_SIZES = imageGenerationCore.SUPPORTED_IMAGE_SIZES;
export const SUPPORTED_IMAGE_QUALITIES = imageGenerationCore.SUPPORTED_IMAGE_QUALITIES;
export const SUPPORTED_IMAGE_OUTPUT_FORMATS = imageGenerationCore.SUPPORTED_IMAGE_OUTPUT_FORMATS;

export function normalizeImageSize(value, fallback = "1024x1024") {
  return imageGenerationCore.normalizeImageSize(value, fallback);
}

export function normalizeImageQuality(value, fallback = "auto") {
  return imageGenerationCore.normalizeImageQuality(value, fallback);
}

export function normalizeImageOutputFormat(value, fallback = "webp") {
  return imageGenerationCore.normalizeImageOutputFormat(value, fallback);
}

export function normalizeTargetDimension(value) {
  return imageGenerationCore.normalizeTargetDimension(value);
}

export function resolveImageTargetSize(input = {}) {
  return imageGenerationCore.resolveImageTargetSize(input);
}

export function getImageGenerationSettings() {
  return aiServiceSettings.getImageGenerationSettings();
}

export function getAiServiceSettings() {
  return aiServiceSettings.getAiServiceSettings();
}

export function maskSecret(value = "") {
  return aiServiceSettings.maskSecret(value);
}

export function closestImageSizeForSpec(spec = {}, fallback = "1024x1024") {
  return imageGenerationCore.closestImageSizeForSpec(spec, fallback);
}
