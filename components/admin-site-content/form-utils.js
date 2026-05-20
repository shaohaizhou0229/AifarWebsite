import { SITE_LAYOUT_VERSION } from "@/lib/site-page-builder";

export const EMPTY_ENTRY = {
  isPublished: false,
  publishedAt: null,
  updatedAt: null
};

export const TEMPLATE_KEYS = ["home-current", "product-current", "conversion"];

export function cloneContent(content) {
  return JSON.parse(JSON.stringify(content || {}));
}

export function ensureLayout(content) {
  return {
    ...cloneContent(content),
    layoutVersion: SITE_LAYOUT_VERSION,
    sections: Array.isArray(content?.sections) ? content.sections : []
  };
}

export function updateSeo(content, key, value) {
  return {
    ...content,
    seo: {
      ...(content.seo || {}),
      [key]: value
    }
  };
}

export function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export function updateSectionAt(sections, sectionId, updater) {
  return sections.map((section) => (section.id === sectionId ? updater(section) : section));
}

export function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
