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
  normalizeAssetUploadSessionInput,
  normalizeAssetUploadStatusInput,
  splitRelativeAssetPath,
  validateAssetFileInput
} = require("../lib/project-assets-core.cjs");

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
