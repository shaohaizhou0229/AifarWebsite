const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getLayoutControlsForSection,
  getSectionRenderAttributes,
  getStyleControlsForSection,
  patchSectionLayoutToken,
  patchSectionStyleToken,
  sanitizeAnchorId
} = require("../lib/section-setting-controls.cjs");

function baseSection(type = "card_grid") {
  return {
    id: "section-1",
    type,
    variant: "three",
    settings: {},
    content: {}
  };
}

test("style and layout controls are scoped by section type", () => {
  assert.deepEqual(getStyleControlsForSection("hero").includes("cardStyle"), false);
  assert.deepEqual(getStyleControlsForSection("card_grid").includes("cardStyle"), true);
  assert.deepEqual(getLayoutControlsForSection("support_entry").includes("cardColumns"), true);
  assert.deepEqual(getLayoutControlsForSection("updates_list").includes("imagePosition"), false);
  assert.deepEqual(getStyleControlsForSection("ai_layout").includes("imageRadius"), true);
  assert.deepEqual(getLayoutControlsForSection("ai_layout").includes("contentAlign"), true);
});

test("style token patching only accepts visible allowlisted values", () => {
  const section = baseSection();
  const withToken = patchSectionStyleToken(section, "cardStyle", "shadow");
  const invalidValue = patchSectionStyleToken(withToken, "cardStyle", "floating");
  const invalidKey = patchSectionStyleToken(withToken, "customCss", "red");

  assert.equal(withToken.settings.style.cardStyle, "shadow");
  assert.deepEqual(invalidValue, withToken);
  assert.deepEqual(invalidKey, withToken);
  assert.deepEqual(section.settings, {});
});

test("layout token patching accepts numeric tokens and removes empty values", () => {
  const section = patchSectionLayoutToken(baseSection(), "cardColumns", 3);
  const removed = patchSectionLayoutToken(section, "cardColumns", "");

  assert.equal(section.settings.layout.cardColumns, 3);
  assert.equal(removed.settings.layout, undefined);
});

test("render attributes only contain safe known data attributes", () => {
  const section = {
    ...baseSection(),
    settings: {
      style: {
        cardStyle: "outlined",
        customCss: "body{}"
      },
      layout: {
        cardColumns: 4,
        customLayout: "absolute"
      }
    }
  };
  const attrs = getSectionRenderAttributes(section);

  assert.equal(attrs.className, "cms-section-settings");
  assert.deepEqual(attrs.attributes, {
    "data-card-style": "outlined",
    "data-card-columns": "4"
  });
});

test("old sections without settings produce no setting attributes", () => {
  assert.deepEqual(getSectionRenderAttributes({ type: "hero" }), {
    className: "",
    attributes: {}
  });
});

test("anchor IDs are constrained for layout settings", () => {
  assert.equal(sanitizeAnchorId("contact-entry"), "contact-entry");
  assert.equal(sanitizeAnchorId("  onload=bad  "), "onloadbad");
  assert.equal(sanitizeAnchorId("123-start"), "");
  assert.equal(sanitizeAnchorId("<script>"), "script");
});
