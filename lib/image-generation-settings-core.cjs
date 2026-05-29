const SUPPORTED_IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
const SUPPORTED_IMAGE_QUALITIES = ["auto", "low", "medium", "high"];
const SUPPORTED_IMAGE_OUTPUT_FORMATS = ["png", "jpeg", "webp"];
const DEFAULT_TARGET_IMAGE_SIZE = "1024x1024";
const SECTION_IMAGE_SIZE_RECOMMENDATIONS = {
  "hero.heroImagePath": { width: 1536, height: 864 },
  "media_feature.imagePath": { width: 1536, height: 1024 }
};

function normalizeImageSize(value, fallback = "1024x1024") {
  const size = String(value || "").trim();
  return SUPPORTED_IMAGE_SIZES.includes(size) ? size : fallback;
}

function parseImageSize(value = DEFAULT_TARGET_IMAGE_SIZE, fallback = DEFAULT_TARGET_IMAGE_SIZE) {
  const normalized = String(value || fallback || DEFAULT_TARGET_IMAGE_SIZE).trim();
  const [width, height] = normalized.split("x").map(Number);
  if (width > 0 && height > 0) return { width, height, size: `${width}x${height}` };
  const [fallbackWidth, fallbackHeight] = String(fallback || DEFAULT_TARGET_IMAGE_SIZE).split("x").map(Number);
  return {
    width: fallbackWidth || 1024,
    height: fallbackHeight || 1024,
    size: `${fallbackWidth || 1024}x${fallbackHeight || 1024}`
  };
}

function normalizeTargetDimension(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(Math.max(Math.trunc(number), 128), 4096);
}

function normalizeImageQuality(value, fallback = "auto") {
  const quality = String(value || "").trim().toLowerCase();
  return SUPPORTED_IMAGE_QUALITIES.includes(quality) ? quality : fallback;
}

function normalizeImageOutputFormat(value, fallback = "webp") {
  const format = String(value || "").trim().toLowerCase();
  return SUPPORTED_IMAGE_OUTPUT_FORMATS.includes(format) ? format : fallback;
}

function closestImageSizeForSpec(spec = {}, fallback = "1024x1024") {
  const width = Number(spec.width || spec.targetWidth || 0);
  const height = Number(spec.height || spec.targetHeight || 0);
  if (!width || !height) return normalizeImageSize(spec.size, fallback);

  const targetRatio = width / height;
  return SUPPORTED_IMAGE_SIZES.reduce((best, size) => {
    const [nextWidth, nextHeight] = size.split("x").map(Number);
    const nextScore = Math.abs((nextWidth / nextHeight) - targetRatio);
    return nextScore < best.score ? { size, score: nextScore } : best;
  }, { size: normalizeImageSize(fallback, "1024x1024"), score: Number.POSITIVE_INFINITY }).size;
}

function getSectionImageRecommendation(sectionType = "", pathKey = "") {
  const key = `${String(sectionType || "").trim()}.${String(pathKey || "").trim()}`;
  if (SECTION_IMAGE_SIZE_RECOMMENDATIONS[key]) {
    return { ...SECTION_IMAGE_SIZE_RECOMMENDATIONS[key], size: `${SECTION_IMAGE_SIZE_RECOMMENDATIONS[key].width}x${SECTION_IMAGE_SIZE_RECOMMENDATIONS[key].height}` };
  }
  if (sectionType && (pathKey === "heroImagePath" || pathKey === "imagePath")) {
    return { width: 1024, height: 1024, size: "1024x1024" };
  }
  return null;
}

function normalizeSiliconFlowImageSize(value, fallback = "1024x1024") {
  return normalizeImageSize(value, fallback);
}

function siliconFlowStepsForQuality(quality) {
  const normalized = normalizeImageQuality(quality, "medium");
  if (normalized === "low") return 20;
  if (normalized === "high") return 40;
  return 30;
}

function siliconFlowGuidanceForQuality(quality) {
  const normalized = normalizeImageQuality(quality, "medium");
  if (normalized === "low") return 6;
  if (normalized === "high") return 8;
  return 7;
}

function buildOpenAIImagePayload({ model, prompt, size, quality, outputFormat }) {
  return {
    model,
    prompt,
    size,
    quality,
    n: 1,
    output_format: outputFormat
  };
}

function buildSiliconFlowImagePayload({ model, prompt, size, quality }) {
  return {
    model,
    prompt,
    image_size: normalizeSiliconFlowImageSize(size, "1024x1024"),
    batch_size: 1,
    num_inference_steps: siliconFlowStepsForQuality(quality),
    guidance_scale: siliconFlowGuidanceForQuality(quality)
  };
}

function resolveImageTargetSize(input = {}) {
  const defaultSize = normalizeImageSize(input.defaultSize, DEFAULT_TARGET_IMAGE_SIZE);
  const defaultTarget = parseImageSize(defaultSize, DEFAULT_TARGET_IMAGE_SIZE);
  const spec = input.spec || {};
  const width = normalizeTargetDimension(spec.width || input.targetWidth);
  const height = normalizeTargetDimension(spec.height || input.targetHeight);
  const hasWidth = Boolean(Number(spec.width || input.targetWidth || 0));
  const hasHeight = Boolean(Number(spec.height || input.targetHeight || 0));
  const hasCompleteCustomSize = Boolean(width && height);
  const hasPartialCustomSize = Boolean((hasWidth || hasHeight) && !hasCompleteCustomSize);
  const recommendation = getSectionImageRecommendation(input.sectionType, input.pathKey);

  let target = defaultTarget;
  let sizeSource = "aiDefault";

  if (hasCompleteCustomSize) {
    target = { width, height, size: `${width}x${height}` };
    sizeSource = spec.source === "aiDefault" ? "aiDefault" : "sectionImageSpec";
  } else if (recommendation) {
    target = recommendation;
    sizeSource = "sectionRecommendation";
  }

  const actualSize = closestImageSizeForSpec({ targetWidth: target.width, targetHeight: target.height }, defaultSize);

  return {
    targetWidth: target.width,
    targetHeight: target.height,
    targetSize: `${target.width}x${target.height}`,
    actualSize,
    sizeSource,
    hasCompleteCustomSize,
    hasPartialCustomSize,
    recommendation,
    defaultTarget
  };
}

module.exports = {
  DEFAULT_TARGET_IMAGE_SIZE,
  SECTION_IMAGE_SIZE_RECOMMENDATIONS,
  SUPPORTED_IMAGE_SIZES,
  SUPPORTED_IMAGE_QUALITIES,
  SUPPORTED_IMAGE_OUTPUT_FORMATS,
  buildOpenAIImagePayload,
  buildSiliconFlowImagePayload,
  closestImageSizeForSpec,
  getSectionImageRecommendation,
  normalizeImageOutputFormat,
  normalizeImageQuality,
  normalizeImageSize,
  normalizeTargetDimension,
  parseImageSize,
  resolveImageTargetSize
};
