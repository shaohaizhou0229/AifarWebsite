export const SITE_LAYOUT_VERSION = 1;

export const SITE_SECTION_TYPES = [
  "hero",
  "trust_bar",
  "card_grid",
  "feature_list",
  "capability_matrix",
  "media_feature",
  "updates_list",
  "cta_band"
];

export const SITE_SECTION_LABELS = {
  hero: "Hero",
  trust_bar: "Trust data",
  card_grid: "Card grid",
  feature_list: "Feature list",
  capability_matrix: "Capability matrix",
  media_feature: "Media feature",
  updates_list: "Updates",
  cta_band: "CTA"
};

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeSeo(value, fallback = {}) {
  return {
    ...fallback,
    ...(isObject(value) ? value : {})
  };
}

function createSectionId(type, index) {
  return `${type}-${index + 1}`;
}

export function createBlankSection(type, id) {
  const sectionId = id || `${type}-${Date.now()}`;

  if (type === "hero") {
    return {
      id: sectionId,
      type,
      variant: "split",
      settings: {},
      content: {
        eyebrow: "",
        title: "",
        lead: "",
        primaryCta: "",
        primaryHref: "/downloads/",
        secondaryCta: "",
        secondaryHref: "/contact/",
        heroImagePath: "",
        heroImageUrl: "",
        heroAlt: ""
      }
    };
  }

  if (type === "trust_bar") {
    return {
      id: sectionId,
      type,
      variant: "four",
      settings: {},
      content: { ariaLabel: "", items: [["", ""]] }
    };
  }

  if (type === "card_grid" || type === "capability_matrix") {
    return {
      id: sectionId,
      type,
      variant: type === "card_grid" ? "four" : "three",
      settings: {},
      content: { title: "", lead: "", items: [["", "", ""]] }
    };
  }

  if (type === "feature_list") {
    return {
      id: sectionId,
      type,
      variant: "list",
      settings: {},
      content: { title: "", lead: "", items: [["", ""]] }
    };
  }

  if (type === "media_feature") {
    return {
      id: sectionId,
      type,
      variant: "image-right",
      settings: {},
      content: {
        eyebrow: "",
        title: "",
        lead: "",
        imagePath: "",
        imageUrl: "",
        imageAlt: "",
        items: [["", ""]]
      }
    };
  }

  if (type === "updates_list") {
    return {
      id: sectionId,
      type,
      variant: "list",
      settings: {},
      content: { title: "", actionLabel: "", actionHref: "/whats-new/", items: [["", "", ""]] }
    };
  }

  return {
    id: sectionId,
    type: "cta_band",
    variant: "dark",
    settings: {},
    content: {
      eyebrow: "",
      title: "",
      lead: "",
      primaryCta: "",
      primaryHref: "/downloads/",
      secondaryCta: "",
      secondaryHref: "/support/"
    }
  };
}

function normalizeSection(section, index, getImageUrl) {
  const type = SITE_SECTION_TYPES.includes(section?.type) ? section.type : "card_grid";
  const base = createBlankSection(type, section?.id || createSectionId(type, index));
  const content = {
    ...base.content,
    ...(isObject(section?.content) ? section.content : {})
  };

  for (const key of ["heroImagePath", "imagePath"]) {
    if (content[key]) {
      const urlKey = key === "heroImagePath" ? "heroImageUrl" : "imageUrl";
      content[urlKey] = getImageUrl(content[key]) || content[urlKey] || "";
    }
  }

  return {
    id: section?.id || base.id,
    type,
    variant: section?.variant || base.variant,
    settings: isObject(section?.settings) ? section.settings : base.settings,
    content
  };
}

function buildLegacyHomeSections(page) {
  return [
    {
      id: "hero-1",
      type: "hero",
      variant: "split",
      settings: {},
      content: {
        eyebrow: page.eyebrow,
        title: page.title,
        lead: page.lead,
        primaryCta: page.primaryCta,
        primaryHref: "/downloads/",
        secondaryCta: page.secondaryCta,
        secondaryHref: "/contact/",
        heroImagePath: page.heroImagePath || "",
        heroImageUrl: page.heroImageUrl || "",
        heroAlt: page.heroAlt || ""
      }
    },
    {
      id: "trust_bar-1",
      type: "trust_bar",
      variant: "four",
      settings: {},
      content: { ariaLabel: page.trustLabel, items: normalizeArray(page.trust) }
    },
    {
      id: "card_grid-1",
      type: "card_grid",
      variant: "four",
      settings: { tone: "alt" },
      content: { title: page.modulesTitle, lead: page.modulesLead, items: normalizeArray(page.modules) }
    },
    {
      id: "feature_list-1",
      type: "feature_list",
      variant: "list",
      settings: {},
      content: { title: page.managedTitle, lead: page.managedLead, items: normalizeArray(page.features) }
    },
    {
      id: "updates_list-1",
      type: "updates_list",
      variant: "list",
      settings: { tone: "alt" },
      content: { title: page.updatesTitle, actionLabel: page.viewAll, actionHref: "/whats-new/", items: normalizeArray(page.updates) }
    },
    {
      id: "cta_band-1",
      type: "cta_band",
      variant: "dark",
      settings: {},
      content: {
        eyebrow: page.ctaEyebrow,
        title: page.ctaTitle,
        lead: page.ctaLead,
        primaryCta: page.ctaPrimary,
        primaryHref: "/downloads/",
        secondaryCta: page.ctaSecondary,
        secondaryHref: "/support/"
      }
    }
  ];
}

function buildLegacyProductSections(page) {
  const sections = [
    {
      id: "hero-1",
      type: "hero",
      variant: "simple",
      settings: {},
      content: {
        eyebrow: page.eyebrow,
        title: page.title,
        lead: page.lead,
        heroImagePath: page.heroImagePath || "",
        heroImageUrl: page.heroImageUrl || "",
        heroAlt: page.heroAlt || page.title || ""
      }
    }
  ];

  if (page.heroImagePath) {
    sections.push({
      id: "media_feature-1",
      type: "media_feature",
      variant: "image-only",
      settings: {},
      content: {
        title: "",
        lead: "",
        imagePath: page.heroImagePath,
        imageUrl: page.heroImageUrl,
        imageAlt: page.heroAlt || page.title || "",
        items: []
      }
    });
  }

  sections.push({
    id: "capability_matrix-1",
    type: "capability_matrix",
    variant: "three",
    settings: { tone: "alt" },
    content: { title: "", lead: "", items: normalizeArray(page.features) }
  });

  return sections;
}

function mergeLegacyPage(pageKey, fallback, override, getImageUrl) {
  const content = isObject(override) ? override : {};
  const merged = {
    ...fallback,
    ...content,
    seo: normalizeSeo(content.seo, fallback.seo)
  };

  if (pageKey === "home") {
    merged.trust = normalizeArray(content.trust, fallback.trust);
    merged.modules = normalizeArray(content.modules, fallback.modules);
    merged.features = normalizeArray(content.features, fallback.features);
    merged.updates = normalizeArray(content.updates, fallback.updates);
  }

  if (pageKey === "product") {
    merged.features = normalizeArray(content.features, fallback.features);
  }

  merged.heroImagePath = content.heroImagePath || fallback.heroImagePath || "";
  merged.heroImageUrl = getImageUrl(merged.heroImagePath) || fallback.heroImageUrl || "/assets/images/aifar-hero.png";
  return merged;
}

export function normalizeSitePageContent(pageKey, fallback, override, getImageUrl = () => "") {
  const safeFallback = clone(fallback);
  const source = isObject(override) ? override : null;
  const hasLayout = source?.layoutVersion && Array.isArray(source.sections);
  const legacyPage = mergeLegacyPage(pageKey, safeFallback, hasLayout ? null : source, getImageUrl);
  const rawSections = hasLayout
    ? source.sections
    : pageKey === "home"
      ? buildLegacyHomeSections(legacyPage)
      : buildLegacyProductSections(legacyPage);
  const sections = rawSections.map((section, index) => normalizeSection(section, index, getImageUrl));
  const heroSection = sections.find((section) => section.type === "hero");
  const heroImagePath = heroSection?.content?.heroImagePath || legacyPage.heroImagePath || "";

  return {
    ...legacyPage,
    ...(source && hasLayout ? source : {}),
    seo: normalizeSeo(source?.seo, safeFallback.seo),
    layoutVersion: SITE_LAYOUT_VERSION,
    sections,
    heroImagePath,
    heroImageUrl: getImageUrl(heroImagePath) || heroSection?.content?.heroImageUrl || legacyPage.heroImageUrl || "/assets/images/aifar-hero.png",
    heroAlt: heroSection?.content?.heroAlt || legacyPage.heroAlt || legacyPage.title || "",
    schemaDescription: source?.schemaDescription || safeFallback.schemaDescription || legacyPage.lead || ""
  };
}

export function createSitePageTemplate(templateKey, pageKey, fallback, getImageUrl = () => "") {
  const base = normalizeSitePageContent(pageKey, fallback, null, getImageUrl);

  if (templateKey === "product-current") {
    return {
      ...base,
      sections: buildLegacyProductSections(base).map((section, index) => normalizeSection(section, index, getImageUrl))
    };
  }

  if (templateKey === "conversion") {
    return {
      ...base,
      sections: [
        normalizeSection(createBlankSection("hero", "hero-1"), 0, getImageUrl),
        normalizeSection({
          ...createBlankSection("card_grid", "card_grid-1"),
          content: {
            title: base.modulesTitle || base.title,
            lead: base.modulesLead || base.lead,
            items: normalizeArray(base.modules, normalizeArray(base.features)).slice(0, 4)
          }
        }, 1, getImageUrl),
        normalizeSection({
          ...createBlankSection("capability_matrix", "capability_matrix-1"),
          content: {
            title: base.managedTitle || "",
            lead: base.managedLead || "",
            items: normalizeArray(base.features)
          }
        }, 2, getImageUrl),
        normalizeSection({
          ...createBlankSection("cta_band", "cta_band-1"),
          content: {
            eyebrow: base.ctaEyebrow || base.eyebrow,
            title: base.ctaTitle || base.title,
            lead: base.ctaLead || base.lead,
            primaryCta: base.ctaPrimary || base.primaryCta || "",
            primaryHref: "/downloads/",
            secondaryCta: base.ctaSecondary || base.secondaryCta || "",
            secondaryHref: "/contact/"
          }
        }, 3, getImageUrl)
      ].map((section, index) => {
        if (section.type !== "hero") return section;
        return normalizeSection({
          ...section,
          content: {
            ...section.content,
            eyebrow: base.eyebrow,
            title: base.title,
            lead: base.lead,
            primaryCta: base.primaryCta || "",
            primaryHref: "/downloads/",
            secondaryCta: base.secondaryCta || "",
            secondaryHref: "/contact/",
            heroImagePath: base.heroImagePath || "",
            heroImageUrl: base.heroImageUrl || "",
            heroAlt: base.heroAlt || ""
          }
        }, index, getImageUrl);
      })
    };
  }

  return {
    ...base,
    sections: buildLegacyHomeSections(base).map((section, index) => normalizeSection(section, index, getImageUrl))
  };
}

export function collectSiteImagePaths(content) {
  const paths = new Set();

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if ((key === "heroImagePath" || key === "imagePath") && typeof child === "string" && child) {
        paths.add(child);
      } else {
        visit(child);
      }
    }
  }

  visit(content);
  return [...paths];
}
