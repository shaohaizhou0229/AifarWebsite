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

test("ai layout templates normalize safe relative elements without fixed page width", () => {
  const template = normalizeSectionTemplateInput({
    name: "AI screenshot layout",
    industry: "custom",
    source: "ai",
    content: {
      id: "ai-layout-source",
      type: "ai_layout",
      variant: "screenshot_composition",
      settings: {
        style: { textSize: "medium", buttonStyle: "solid" },
        layout: { contentAlign: "center" }
      },
      content: {
        canvas: {
          aspectRatio: 1.7,
          sourceWidth: 1440,
          sourceHeight: 860,
          width: 1440,
          maxWidth: "content"
        },
        elements: [
          { id: "title", type: "text", text: "Fast onboarding", x: 0.2, y: 0.1, width: 0.6, height: 0.14 },
          { id: "cta", type: "button", role: "cta", text: "Start", href: "/contact/", box: { x: 0.44, y: 0.3, width: 0.12, height: 0.07 }, appearance: { variant: "solid", fill: "purple", padding: "xs" } },
          { id: "image", type: "image", role: "media", alt: "Product placeholder", x: 0.18, y: 0.5, width: 0.64, height: 0.36, appearance: { variant: "placeholder-solid", fill: "purple", fit: "contain" } }
        ]
      }
    }
  });
  const section = template.content.sections[0];

  assert.equal(section.type, "ai_layout");
  assert.equal(section.variant, "screenshot_composition");
  assert.equal(section.content.canvas.maxWidth, "content");
  assert.equal(section.content.canvas.width, undefined);
  assert.equal(section.content.elements[0].box.x, 0.2);
  assert.equal(section.content.elements[1].href, "/contact/");
  assert.equal(section.content.elements[1].role, "cta");
  assert.equal(section.content.elements[1].appearance.variant, "solid");
  assert.equal(section.content.elements[1].appearance.fill, "purple");
  assert.equal(section.content.elements[2].role, "media");
  assert.equal(section.content.elements[2].appearance.variant, "placeholder-solid");
});

test("ai layout rejects unsafe elements and clamps overflowing coordinates", () => {
  assert.throws(
    () => normalizeSectionTemplateContent({
      type: "ai_layout",
      variant: "screenshot_composition",
      content: {
        elements: [{ type: "video", x: 0, y: 0, width: 1, height: 1 }]
      }
    }),
    /Unsupported AI layout element type/
  );

  const content = normalizeSectionTemplateContent({
    type: "ai_layout",
    variant: "screenshot_composition",
    content: {
      elements: [{ type: "text", text: "Safe", x: 0.9, y: 0.92, width: 0.4, height: 0.4 }]
    }
  });

  assert.equal(content.sections[0].content.elements[0].box.width, 0.1);
  assert.equal(content.sections[0].content.elements[0].box.height, 0.08);
  assert.throws(
    () => normalizeSectionTemplateContent({
      type: "ai_layout",
      variant: "screenshot_composition",
      content: {
        elements: [{ type: "text", text: "<script>alert(1)</script>", x: 0, y: 0, width: 1, height: 0.1 }]
      }
    }),
    /Unsafe AI layout value/
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
