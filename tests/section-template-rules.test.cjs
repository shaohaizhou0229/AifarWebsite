const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SITE_LAYOUT_VERSION,
  createInsertableSectionFromTemplate,
  normalizeSectionTemplateContent,
  normalizeSectionTemplateInput,
  normalizeSectionSettings
} = require("../lib/section-template-rules.cjs");

const heroSection = {
  id: "hero-source",
  type: "hero",
  variant: "split",
  settings: {
    tone: "alt",
    style: {
      textSize: "large",
      cardStyle: "outlined",
      buttonStyle: "solid"
    },
    layout: {
      desktopArrangement: "background",
      mobileArrangement: "single-column",
      cardColumns: 3,
      entranceAnimation: "stagger",
      hoverIn: "lift",
      hoverOut: "reset"
    },
    imageSpecs: {
      heroImagePath: {
        width: 1536,
        height: 864,
        source: "sectionImageSpec"
      }
    }
  },
  content: {
    eyebrow: "Public service",
    title: "Service entry",
    lead: "Give visitors a clear path.",
    primaryCta: "Start",
    primaryHref: "/contact/",
    secondaryCta: "Download",
    secondaryHref: "/downloads/"
  }
};

test("section template input normalizes into a single insertable layout", () => {
  const template = normalizeSectionTemplateInput({
    locale: "zh-CN",
    name: "Public service hero",
    industry: "public_service",
    purpose: "service_entry",
    source: "manual",
    tags: ["hero", "hero", "public_service"],
    content: heroSection
  });

  assert.equal(template.name, "Public service hero");
  assert.equal(template.content.layoutVersion, SITE_LAYOUT_VERSION);
  assert.equal(template.content.sections.length, 1);
  assert.equal(template.content.sections[0].type, "hero");
  assert.deepEqual(template.tags, ["hero", "public_service"]);
});

test("section template content rejects multiple sections", () => {
  assert.throws(
    () => normalizeSectionTemplateContent({ sections: [heroSection, heroSection] }),
    /exactly one section/
  );
});

test("section template rules reject unsupported section types and variants", () => {
  assert.throws(
    () => normalizeSectionTemplateContent({ type: "free_html", variant: "default", content: {} }),
    /Unsupported section type/
  );

  assert.throws(
    () => normalizeSectionTemplateContent({ ...heroSection, variant: "custom-code" }),
    /Unsupported section variant/
  );
});

test("section template rules reject unsafe html css and javascript payloads", () => {
  assert.throws(
    () => normalizeSectionTemplateContent({
      ...heroSection,
      content: {
        title: "<script>alert(1)</script>"
      }
    }),
    /Unsafe template value/
  );

  assert.throws(
    () => normalizeSectionTemplateContent({
      ...heroSection,
      content: {
        primaryHref: "javascript:alert(1)"
      }
    }),
    /Unsafe template value/
  );

  assert.throws(
    () => normalizeSectionTemplateContent({
      ...heroSection,
      settings: {
        customCss: ".hero { color: red; }"
      }
    }),
    /Unsupported section setting|Unsafe/
  );
});

test("section settings only accept controlled style and layout tokens", () => {
  assert.deepEqual(
    normalizeSectionSettings({
      tone: "alt",
      anchorId: "support",
      style: { textSize: "medium", cardStyle: "shadow" },
      layout: { cardColumns: 4, hoverIn: "reveal" }
    }),
    {
      tone: "alt",
      anchorId: "support",
      style: { textSize: "medium", cardStyle: "shadow" },
      layout: { cardColumns: 4, hoverIn: "reveal" }
    }
  );

  assert.throws(
    () => normalizeSectionSettings({ style: { freeCss: "color:red" } }),
    /Unsupported token/
  );

  assert.throws(
    () => normalizeSectionSettings({ layout: { cardColumns: 12 } }),
    /Invalid token value/
  );
});

test("insertable sections receive a fresh id without mutating template content", () => {
  const templateContent = normalizeSectionTemplateContent(heroSection);
  const inserted = createInsertableSectionFromTemplate(templateContent, { idSuffix: "copy" });

  assert.equal(inserted.id, "hero-copy");
  assert.equal(templateContent.sections[0].id, "hero-source");
});
