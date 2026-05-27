const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_PROJECT_ASSET_SIZE,
  normalizeAssetBulkInput,
  normalizeAssetDirectory,
  normalizeAssetSearchParams,
  normalizeAssetTagName,
  normalizeAssetTags,
  normalizeAssetUpdateInput,
  normalizeAssetUsageStoragePath,
  normalizeAssetUploadSessionInput,
  normalizeAssetUploadStatusInput,
  splitRelativeAssetPath,
  validateAssetFileInput
} = require("../lib/project-assets-core.cjs");
const { buildSectionImagePromptContext } = require("../lib/asset-prompt-context.cjs");
const {
  closestImageSizeForSpec,
  normalizeImageOutputFormat,
  normalizeImageQuality,
  normalizeImageSize
} = require("../lib/image-generation-settings-core.cjs");

test("asset validation accepts the configured image formats up to 5 MB", () => {
  for (const [name, type] of [
    ["hero.jpg", "image/jpeg"],
    ["hero.png", "image/png"],
    ["hero.webp", "image/webp"],
    ["hero.svg", "image/svg+xml"]
  ]) {
    assert.deepEqual(validateAssetFileInput({ name, type, size: MAX_PROJECT_ASSET_SIZE }), { ok: true, code: "ok" });
  }
});

test("image generation settings map custom targets to supported service sizes", () => {
  assert.equal(closestImageSizeForSpec({ targetWidth: 1440, targetHeight: 900 }, "1024x1024"), "1536x1024");
  assert.equal(closestImageSizeForSpec({ targetWidth: 900, targetHeight: 1440 }, "1024x1024"), "1024x1536");
  assert.equal(closestImageSizeForSpec({ targetWidth: 1200, targetHeight: 1200 }, "1024x1024"), "1024x1024");
  assert.equal(normalizeImageSize("2048x2048", "1024x1024"), "1024x1024");
  assert.equal(normalizeImageQuality("HIGH"), "high");
  assert.equal(normalizeImageOutputFormat("jpg", "webp"), "webp");
});

test("asset validation rejects oversized and unsupported files", () => {
  assert.equal(validateAssetFileInput({ name: "hero.gif", type: "image/gif", size: 1024 }).code, "unsupportedType");
  assert.equal(validateAssetFileInput({ name: "hero.png", type: "image/png", size: MAX_PROJECT_ASSET_SIZE + 1 }).code, "tooLarge");
  assert.equal(validateAssetFileInput({ name: "", type: "image/png", size: 1024 }).code, "missingName");
});

test("folder uploads preserve safe relative directories", () => {
  assert.deepEqual(splitRelativeAssetPath("campaign/home/hero.png"), {
    directoryPath: "campaign/home",
    filename: "hero.png"
  });
  assert.equal(normalizeAssetDirectory("../campaign\\home//./"), "campaign/home");
});

test("asset search and update input are normalized", () => {
  assert.deepEqual(normalizeAssetSearchParams({ q: " hero ", directory: " home ", source: "generated", tag: " Cover ", page: "2", limit: "100" }), {
    q: "hero",
    directoryPath: "home",
    source: "generated",
    tag: "Cover",
    page: 2,
    limit: 60,
    offset: 60
  });
  assert.deepEqual(normalizeAssetUpdateInput({
    displayName: " Hero ",
    altText: " Main image ",
    directoryPath: "home",
    tags: "hero, website, hero"
  }), {
    displayName: "Hero",
    altText: "Main image",
    directoryPath: "home",
    tags: ["hero", "website"]
  });
});

test("asset folder and tag catalogs use safe reusable values", () => {
  assert.equal(normalizeAssetDirectory(" ../Campaign\\Home// "), "Campaign/Home");
  assert.equal(normalizeAssetTagName("  launch tag  "), "launch tag");
  assert.deepEqual(normalizeAssetTags(["launch", "Launch", "", "site"]), ["launch", "site"]);
  assert.equal(normalizeAssetUsageStoragePath("/generated\\hero.png"), "generated/hero.png");
  assert.equal(normalizeAssetUsageStoragePath("../secret.png"), "");
});

test("section image prompt context summarizes reusable block content", () => {
  const context = buildSectionImagePromptContext({
    pageKey: "home",
    locale: "zh-CN",
    pathKey: "imagePath",
    size: "1536x1024",
    sizeSource: "sectionImageSpec",
    section: {
      id: "features-1",
      type: "feature_grid",
      variant: "cards",
      content: {
        eyebrow: "主视觉",
        title: "政府团队协同平台",
        lead: "统一消息、会议、文档和流程。",
        primaryCta: "下载客户端",
        items: [
          ["Chat", "团队沟通"],
          { title: "Docs", lead: "集中管理材料" }
        ]
      }
    }
  });

  assert.equal(context.hasContext, true);
  assert.match(context.prompt, /政府团队协同平台/);
  assert.match(context.prompt, /Target generation size: 1536x1024/);
  assert.equal(context.metadata.pageKey, "home");
  assert.equal(context.metadata.sectionId, "features-1");
  assert.equal(context.metadata.sizeSource, "sectionImageSpec");
  assert.ok(context.summary.includes("政府团队协同平台"));
});

test("asset upload sessions normalize folder source and validation", () => {
  assert.deepEqual(normalizeAssetUploadSessionInput({
    filename: "hero.png",
    fileSize: 2048,
    contentType: "image/png",
    relativePath: "Campaign/Home/hero.png"
  }), {
    filename: "hero.png",
    displayName: "hero.png",
    directoryPath: "Campaign/Home",
    relativePath: "Campaign/Home/hero.png",
    fileSize: 2048,
    contentType: "image/png",
    source: "folder_upload"
  });

  assert.throws(() => normalizeAssetUploadSessionInput({
    filename: "hero.gif",
    fileSize: 1024,
    contentType: "image/gif"
  }), /unsupportedType/);
});

test("asset upload status and bulk inputs are constrained", () => {
  assert.deepEqual(normalizeAssetUploadStatusInput({ status: "paused" }), { uploadStatus: "paused" });
  assert.throws(() => normalizeAssetUploadStatusInput({ status: "ready" }), /Unsupported upload status/);

  const ids = ["11111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111", "bad"];
  assert.deepEqual(normalizeAssetBulkInput({
    action: "tags",
    assetIds: ids,
    tags: "Launch, launch, Home",
    mode: "replace"
  }), {
    action: "tags",
    assetIds: ["11111111-1111-4111-8111-111111111111"],
    directoryPath: "",
    tags: ["Launch", "Home"],
    tagMode: "replace",
    altText: ""
  });

  assert.equal(normalizeAssetBulkInput({
    action: "move",
    assetIds: ["22222222-2222-4222-8222-222222222222"],
    directoryPath: "../Project\\Hero"
  }).directoryPath, "Project/Hero");
});
