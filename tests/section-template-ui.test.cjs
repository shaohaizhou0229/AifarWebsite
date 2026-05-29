const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSectionTemplatesUrl,
  createTemplatePreviewPage,
  filterSectionTemplates,
  insertTemplateSection
} = require("../lib/section-template-ui.cjs");

function createTemplate(overrides = {}) {
  return {
    id: "system-test-hero",
    name: "Public service entry hero",
    description: "A clear hero for service portals.",
    industry: "public_service",
    purpose: "service_entry",
    source: "system",
    pageKey: "home",
    tags: ["hero", "service"],
    content: {
      layoutVersion: 2,
      sections: [
        {
          id: "hero-source",
          type: "hero",
          variant: "split",
          settings: {},
          content: {
            eyebrow: "Public service",
            title: "Start here",
            lead: "Choose the right entry."
          }
        }
      ]
    },
    ...overrides
  };
}

test("template list URL only sends supported page filters", () => {
  assert.equal(
    buildSectionTemplatesUrl({ locale: "zh-CN", pageKey: "home" }),
    "/api/admin/site-content/section-templates/?locale=zh-CN&page=home"
  );
  assert.equal(
    buildSectionTemplatesUrl({ locale: "zh-CN", pageKey: "support" }),
    "/api/admin/site-content/section-templates/?locale=zh-CN"
  );
});

test("template filtering covers industry name purpose description and tags", () => {
  const templates = [
    createTemplate(),
    createTemplate({
      id: "system-marketing-cta",
      name: "Marketing CTA",
      description: "Conversion block",
      industry: "marketing",
      purpose: "cta",
      tags: ["conversion"]
    })
  ];

  assert.deepEqual(filterSectionTemplates(templates, { industry: "public_service" }).map((item) => item.id), ["system-test-hero"]);
  assert.deepEqual(filterSectionTemplates(templates, { query: "conversion" }).map((item) => item.id), ["system-marketing-cta"]);
  assert.deepEqual(filterSectionTemplates(templates, { query: "service_entry" }).map((item) => item.id), ["system-test-hero"]);
});

test("template insertion creates a fresh section without mutating the template", () => {
  const template = createTemplate();
  const currentSections = [
    { id: "hero-existing", type: "hero", variant: "simple", settings: {}, content: {} },
    { id: "cta-existing", type: "cta_band", variant: "dark", settings: {}, content: {} }
  ];
  const result = insertTemplateSection(currentSections, template, {
    afterSectionId: "hero-existing",
    idSuffix: "copy"
  });

  assert.equal(result.insertedSection.id, "hero-copy");
  assert.deepEqual(result.sections.map((section) => section.id), ["hero-existing", "hero-copy", "cta-existing"]);
  assert.equal(template.content.sections[0].id, "hero-source");
  assert.equal(currentSections.length, 2);
});

test("AI pending review template insertion creates a fresh section without mutating the candidate", () => {
  const candidate = createTemplate({
    id: "ai-section-template-preview-1",
    source: "ai",
    status: "pending_review",
    riskFlags: ["manual_review_required"]
  });
  const result = insertTemplateSection([], candidate, { idSuffix: "ai-copy" });

  assert.equal(result.insertedSection.id, "hero-ai-copy");
  assert.equal(result.insertedSection.type, "hero");
  assert.equal(candidate.content.sections[0].id, "hero-source");
});

test("template insertion appends when there is no selected section", () => {
  const result = insertTemplateSection([], createTemplate(), { idSuffix: "first" });

  assert.equal(result.sections.length, 1);
  assert.equal(result.insertedSection.id, "hero-first");
});

test("template preview and insertion reject unsafe template payloads", () => {
  const unsafeTemplate = createTemplate({
    content: {
      type: "hero",
      variant: "split",
      content: {
        title: "<strong>Unsafe</strong>"
      }
    }
  });

  assert.throws(() => createTemplatePreviewPage(unsafeTemplate), /Unsafe template value/);
  assert.throws(() => insertTemplateSection([], unsafeTemplate), /Unsafe template value/);
});
