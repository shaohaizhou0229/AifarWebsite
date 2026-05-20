export const SITE_LAYOUT_VERSION = 1;

export const SITE_SECTION_TYPES = [
  "hero",
  "trust_bar",
  "card_grid",
  "feature_list",
  "capability_matrix",
  "media_feature",
  "scenario_split",
  "workflow_steps",
  "module_showcase",
  "security_assurance",
  "download_panel",
  "faq_band",
  "support_entry",
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
  scenario_split: "Scenario split",
  workflow_steps: "Workflow steps",
  module_showcase: "Module showcase",
  security_assurance: "Security assurance",
  download_panel: "Download panel",
  faq_band: "FAQ band",
  support_entry: "Support entry",
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

function getDefaultRows(rows, fallback) {
  const source = normalizeArray(rows, fallback);
  return source.length ? source : fallback;
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

  if (type === "scenario_split") {
    return {
      id: sectionId,
      type,
      variant: "two",
      settings: { tone: "alt" },
      content: {
        eyebrow: "Use case",
        title: "Match Aifar to the way your team works",
        lead: "Show two operating scenarios side by side so visitors can quickly understand where the product fits.",
        items: [
          ["Government teams", "Coordinate departments, formal requests, documents, and secure collaboration in one managed workspace."],
          ["Enterprise teams", "Keep communication, workflows, support, and business records connected across desktop and mobile clients."]
        ]
      }
    };
  }

  if (type === "workflow_steps") {
    return {
      id: sectionId,
      type,
      variant: "numbered",
      settings: {},
      content: {
        title: "From evaluation to daily operation",
        lead: "Explain the adoption path as a clear sequence instead of a dense feature list.",
        items: [
          ["1", "Plan", "Confirm modules, users, deployment requirements, and support boundaries."],
          ["2", "Launch", "Prepare clients, accounts, documents, and admin operating rules."],
          ["3", "Operate", "Track collaboration, requests, updates, and service feedback from one workspace."]
        ]
      }
    };
  }

  if (type === "module_showcase") {
    return {
      id: sectionId,
      type,
      variant: "six",
      settings: { tone: "alt" },
      content: {
        title: "Core collaboration modules",
        lead: "Group Aifar capabilities into scan-friendly product modules.",
        items: [
          ["Chat", "Team communication"],
          ["Meetings", "Remote coordination"],
          ["Documents", "Shared knowledge"],
          ["Workflows", "Structured requests"],
          ["Contacts", "Organization directory"],
          ["Clients", "Desktop and mobile access"]
        ]
      }
    };
  }

  if (type === "security_assurance") {
    return {
      id: sectionId,
      type,
      variant: "checklist",
      settings: {},
      content: {
        eyebrow: "Security and governance",
        title: "Built for controlled team collaboration",
        lead: "Summarize the governance signals decision makers expect before rollout.",
        items: [
          ["Permission boundaries", "Admin controlled access and scoped operating modules."],
          ["Deployment context", "Clear environment, release, and support expectations."],
          ["Business records", "Content updates and key actions stay traceable for operations."]
        ]
      }
    };
  }

  if (type === "download_panel") {
    return {
      id: sectionId,
      type,
      variant: "split",
      settings: { tone: "alt" },
      content: {
        eyebrow: "Client access",
        title: "Give teams the right client quickly",
        lead: "Place download actions near product value so visitors can move from evaluation to installation.",
        primaryCta: "Download Aifar",
        primaryHref: "/downloads/",
        secondaryCta: "Contact support",
        secondaryHref: "/contact/?type=technical_support",
        items: [
          ["Windows", "Desktop client"],
          ["macOS", "Preview channel"],
          ["Android", "Mobile access"]
        ]
      }
    };
  }

  if (type === "faq_band") {
    return {
      id: sectionId,
      type,
      variant: "accordion",
      settings: {},
      content: {
        title: "Questions visitors usually ask",
        lead: "Answer common evaluation questions without sending users away from the product page.",
        items: [
          ["Who is Aifar for?", "Government and enterprise teams that need lightweight standard collaboration."],
          ["Where can users get support?", "Use the support and contact entry points for product questions and technical issues."],
          ["Can content be updated later?", "Admins can save drafts, preview changes, publish, and restore previous versions."]
        ]
      }
    };
  }

  if (type === "support_entry") {
    return {
      id: sectionId,
      type,
      variant: "four",
      settings: { tone: "alt", anchorId: "support" },
      content: {
        title: "",
        lead: "",
        items: [
          ["Q", "", "", "/contact/?type=product_inquiry", "product_inquiry"],
          ["T", "", "", "/contact/?type=technical_support", "technical_support"],
          ["D", "", "", "/docs/", ""],
          ["S", "", "", "/product/#security", ""]
        ]
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
      secondaryHref: "/contact/?type=technical_support"
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

function enrichHomeSections(sections, page) {
  return [
    ...sections.slice(0, 4),
    {
      ...createBlankSection("scenario_split", "scenario_split-1"),
      content: {
        ...createBlankSection("scenario_split", "scenario_split-1").content,
        title: page.scenarioTitle || "Designed for structured team collaboration",
        lead: page.scenarioLead || "Make it clear how Aifar fits government and enterprise operations.",
        items: getDefaultRows(page.scenarios, createBlankSection("scenario_split", "scenario_split-1").content.items)
      }
    },
    {
      ...createBlankSection("module_showcase", "module_showcase-1"),
      content: {
        ...createBlankSection("module_showcase", "module_showcase-1").content,
        title: page.modulesTitle || "Core collaboration modules",
        lead: page.modulesLead || "",
        items: getDefaultRows(page.modules, createBlankSection("module_showcase", "module_showcase-1").content.items)
      }
    },
    ...sections.slice(4)
  ];
}

function enrichProductSections(sections, page) {
  return [
    ...sections.slice(0, 2),
    {
      ...createBlankSection("workflow_steps", "workflow_steps-1"),
      content: {
        ...createBlankSection("workflow_steps", "workflow_steps-1").content,
        title: page.workflowTitle || "A clear path from evaluation to operation",
        lead: page.workflowLead || "Show visitors what happens after they decide to evaluate Aifar."
      }
    },
    {
      ...createBlankSection("security_assurance", "security_assurance-1"),
      content: {
        ...createBlankSection("security_assurance", "security_assurance-1").content,
        title: page.securityTitle || "Security and governance stay visible",
        lead: page.securityLead || "Keep deployment, permissions, and operating records easy to review."
      }
    },
    {
      ...createBlankSection("download_panel", "download_panel-1"),
      content: {
        ...createBlankSection("download_panel", "download_panel-1").content,
        title: page.downloadTitle || "Download the right client",
        lead: page.downloadLead || "Move from product evaluation to supported installation from one clear path."
      }
    },
    {
      ...createBlankSection("faq_band", "faq_band-1"),
      content: {
        ...createBlankSection("faq_band", "faq_band-1").content,
        title: page.faqTitle || "Evaluation questions",
        lead: page.faqLead || "Resolve common questions before visitors contact the team."
      }
    },
    ...sections.slice(2)
  ];
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
      id: "support_entry-1",
      type: "support_entry",
      variant: "four",
      settings: { tone: "alt", anchorId: "support" },
      content: {
        title: page.supportEntryTitle || "Help, documentation, and support",
        lead: page.supportEntryLead || "Choose the right path for product questions, technical support, documents, and deployment security.",
        items: normalizeArray(page.supportEntryItems, [
          ["Q", "Product inquiry", "Talk to Aifar about scenarios, fit, and rollout planning.", "/contact/?type=product_inquiry", "product_inquiry"],
          ["T", "Technical support", "Submit account, installation, client, or product usage issues.", "/contact/?type=technical_support", "technical_support"],
          ["D", "Documentation", "Read product guides, deployment notes, and technical materials.", "/docs/", ""],
          ["S", "Security and deployment", "Review security, governance, privacy, and deployment context.", "/product/#security", ""]
        ])
      }
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
        secondaryHref: "/contact/?type=technical_support"
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

  sections.push({
    id: "support_entry-1",
    type: "support_entry",
    variant: "four",
    settings: { tone: "alt", anchorId: "security" },
    content: {
      title: page.supportEntryTitle || "Deployment, security, and support",
      lead: page.supportEntryLead || "Keep product evaluation, security review, documentation, and support requests in one clear path.",
      items: normalizeArray(page.supportEntryItems, [
        ["S", "Security and governance", "Use this product section as the security and deployment overview.", "/product/#security", ""],
        ["D", "Documentation", "Open guides and technical materials prepared for users and administrators.", "/docs/", ""],
        ["T", "Technical support", "Submit product usage, installation, account, or client issues.", "/contact/?type=technical_support", "technical_support"],
        ["Q", "Product inquiry", "Discuss rollout fit, deployment planning, and collaboration needs.", "/contact/?type=product_inquiry", "product_inquiry"]
      ])
    }
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
      ? enrichHomeSections(buildLegacyHomeSections(legacyPage), legacyPage)
      : enrichProductSections(buildLegacyProductSections(legacyPage), legacyPage);
  const sections = rawSections.map((section, index) => normalizeSection(section, index, getImageUrl));
  if (!sections.some((section) => section.type === "support_entry")) {
    const supportSection = pageKey === "home"
      ? buildLegacyHomeSections(legacyPage).find((section) => section.type === "support_entry")
      : buildLegacyProductSections(legacyPage).find((section) => section.type === "support_entry");
    if (supportSection) {
      sections.push(normalizeSection(supportSection, sections.length, getImageUrl));
    }
  }
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
      sections: enrichProductSections(buildLegacyProductSections(base), base).map((section, index) => normalizeSection(section, index, getImageUrl))
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
        normalizeSection(createBlankSection("workflow_steps", "workflow_steps-1"), 3, getImageUrl),
        normalizeSection(createBlankSection("security_assurance", "security_assurance-1"), 4, getImageUrl),
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
        }, 5, getImageUrl)
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
    sections: enrichHomeSections(buildLegacyHomeSections(base), base).map((section, index) => normalizeSection(section, index, getImageUrl))
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
