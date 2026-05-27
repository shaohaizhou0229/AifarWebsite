const FIELD_LABELS = {
  eyebrow: "Eyebrow",
  title: "Title",
  lead: "Lead",
  primaryCta: "Primary button",
  secondaryCta: "Secondary button",
  actionLabel: "Action",
  heroAlt: "Current image alt text",
  imageAlt: "Current image alt text",
  ariaLabel: "Accessibility label"
};

const CONTENT_FIELD_ORDER = [
  "eyebrow",
  "title",
  "lead",
  "primaryCta",
  "secondaryCta",
  "actionLabel",
  "heroAlt",
  "imageAlt",
  "ariaLabel"
];

function cleanText(value = "", limit = 180) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function pushField(fields, label, value, limit) {
  const text = cleanText(value, limit);
  if (text) fields.push({ label, value: text });
}

function flattenItemText(item) {
  if (Array.isArray(item)) {
    return item.map((entry) => cleanText(entry, 80)).filter(Boolean).join(" - ");
  }
  if (item && typeof item === "object") {
    return [
      item.eyebrow,
      item.title,
      item.label,
      item.name,
      item.lead,
      item.summary,
      item.description,
      item.text,
      item.actionLabel
    ].map((entry) => cleanText(entry, 80)).filter(Boolean).join(" - ");
  }
  return cleanText(item, 120);
}

function collectItemSummaries(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map(flattenItemText)
    .filter(Boolean)
    .slice(0, 6);
}

function buildSectionImagePromptContext(input = {}) {
  const section = input.section && typeof input.section === "object" ? input.section : null;
  const content = section?.content && typeof section.content === "object" ? section.content : {};
  const fields = [];

  for (const key of CONTENT_FIELD_ORDER) {
    pushField(fields, FIELD_LABELS[key] || key, content[key], 220);
  }

  const itemSummaries = collectItemSummaries(content.items);
  itemSummaries.forEach((item, index) => pushField(fields, `Item ${index + 1}`, item, 180));

  const hasContext = Boolean(section && fields.length);
  const pageKey = cleanText(input.pageKey, 80);
  const locale = cleanText(input.locale, 32);
  const sectionType = cleanText(section?.type, 80);
  const sectionVariant = cleanText(section?.variant, 80);
  const sectionId = cleanText(section?.id, 120);
  const pathKey = cleanText(input.pathKey, 80);
  const size = cleanText(input.size, 32);
  const sizeSource = cleanText(input.sizeSource || "default", 40);

  if (!hasContext) {
    return {
      hasContext: false,
      prompt: "",
      summary: "",
      metadata: {
        pageKey,
        locale,
        sectionId,
        sectionType,
        sectionVariant,
        pathKey,
        size,
        sizeSource
      }
    };
  }

  const contextLines = [
    "Create a website image for the selected Aifar content block.",
    pageKey ? `Page: ${pageKey}` : "",
    locale ? `Language: ${locale}` : "",
    sectionType ? `Section type: ${sectionType}` : "",
    sectionVariant ? `Section variant: ${sectionVariant}` : "",
    pathKey ? `Image slot: ${pathKey}` : "",
    size ? `Target generation size: ${size}` : "",
    "Block content:",
    ...fields.map((field) => `- ${field.label}: ${field.value}`),
    "Visual direction: polished SaaS product website image, clear subject, useful for government and enterprise collaboration, no fake readable UI text unless explicitly requested."
  ].filter(Boolean);

  const summary = fields
    .slice(0, 4)
    .map((field) => field.value)
    .join(" / ")
    .slice(0, 260);

  return {
    hasContext: true,
    prompt: contextLines.join("\n"),
    summary,
    metadata: {
      pageKey,
      locale,
      sectionId,
      sectionType,
      sectionVariant,
      pathKey,
      size,
      sizeSource,
      fields: fields.slice(0, 12)
    }
  };
}

module.exports = {
  buildSectionImagePromptContext,
  cleanText,
  collectItemSummaries
};
