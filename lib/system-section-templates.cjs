const sectionTemplateRules = require("./section-template-rules.cjs");

const SYSTEM_SECTION_TEMPLATE_DEFINITIONS = [
  {
    id: "system-public-service-hero-entry",
    name: "Public service entry hero",
    description: "A clear hero block for public service portals with two actions and service cards.",
    industry: "public_service",
    purpose: "service_entry",
    tags: ["public_service", "hero", "service_entry", "cards"],
    pageKey: "home",
    content: {
      type: "hero",
      variant: "split",
      settings: {
        style: { textSize: "large", cardStyle: "outlined", buttonStyle: "solid", colorScheme: "brand" },
        layout: { desktopArrangement: "background", mobileArrangement: "single-column", cardColumns: 3, entranceAnimation: "fade" },
        imageSpecs: { heroImagePath: { width: 1536, height: 864, source: "sectionImageSpec" } }
      },
      content: {
        eyebrow: "Public service",
        title: "Start from the service your team needs",
        lead: "Guide visitors to common requests, documents, and support paths from one clear entry point.",
        primaryCta: "View services",
        primaryHref: "/product/",
        secondaryCta: "Contact support",
        secondaryHref: "/contact/",
        heroImagePath: "",
        heroImageUrl: "",
        heroAlt: "Public service workspace preview"
      }
    }
  },
  {
    id: "system-public-service-process-steps",
    name: "Public service process steps",
    description: "A numbered process block for explaining how a visitor completes a service.",
    industry: "public_service",
    purpose: "process_steps",
    tags: ["public_service", "workflow", "steps"],
    pageKey: null,
    content: {
      type: "workflow_steps",
      variant: "numbered",
      settings: {
        style: { cardStyle: "outlined", colorScheme: "blue" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 3, entranceAnimation: "stagger" }
      },
      content: {
        title: "A simple path from request to response",
        lead: "Show the service process as a sequence that is easy to scan and easy to verify.",
        items: [
          ["1", "Submit request", "Choose the right service path and provide the required information."],
          ["2", "Review status", "Track the request, supporting documents, and responsible team."],
          ["3", "Receive result", "Get the response, next action, or support guidance in one place."]
        ]
      }
    }
  },
  {
    id: "system-public-service-alert-list",
    name: "Public service announcement list",
    description: "A compact update list for notices, status changes, or public service reminders.",
    industry: "public_service",
    purpose: "announcement",
    tags: ["public_service", "updates", "notices"],
    pageKey: "home",
    content: {
      type: "updates_list",
      variant: "list",
      settings: {
        tone: "alt",
        style: { cardStyle: "flat", colorScheme: "neutral" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", entranceAnimation: "fade" }
      },
      content: {
        title: "Latest service notices",
        actionLabel: "View all updates",
        actionHref: "/whats-new/",
        items: [
          ["Service window updated", "New operation hours and support coverage are now available.", "Notice"],
          ["Document guide refreshed", "Updated guidance helps teams prepare the right materials.", "Guide"],
          ["Support path confirmed", "Use the contact form for product questions and technical support.", "Support"]
        ]
      }
    }
  },
  {
    id: "system-public-service-faq",
    name: "Public service FAQ",
    description: "A question block for common public service and support expectations.",
    industry: "public_service",
    purpose: "faq",
    tags: ["public_service", "faq", "support"],
    pageKey: null,
    content: {
      type: "faq_band",
      variant: "accordion",
      settings: {
        style: { cardStyle: "outlined", colorScheme: "neutral" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column" }
      },
      content: {
        title: "Questions before getting started",
        lead: "Answer the questions visitors usually ask before they contact the team.",
        items: [
          ["Who should use this service?", "Government and enterprise teams that need structured collaboration and support."],
          ["Where do users get help?", "Use the support and contact entry points for product and technical questions."],
          ["Can content change later?", "Administrators can save drafts, preview updates, publish, and restore previous versions."]
        ]
      }
    }
  },
  {
    id: "system-marketing-benefit-cards",
    name: "Marketing benefit cards",
    description: "A three-card benefits block for product value propositions.",
    industry: "marketing",
    purpose: "benefits",
    tags: ["marketing", "cards", "benefits"],
    pageKey: "product",
    content: {
      type: "card_grid",
      variant: "three",
      settings: {
        style: { textSize: "medium", cardStyle: "shadow", iconStyle: "line", colorScheme: "brand" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 3, hoverIn: "lift", hoverOut: "reset" }
      },
      content: {
        title: "Why teams choose Aifar",
        lead: "Turn core product value into three clear reasons a visitor can compare quickly.",
        items: [
          ["01", "Focused collaboration", "Keep communication, requests, and documents connected across teams."],
          ["02", "Lightweight rollout", "Start with practical modules without overwhelming daily operations."],
          ["03", "Managed updates", "Use admin tools to keep content, releases, and support paths current."]
        ]
      }
    }
  },
  {
    id: "system-marketing-media-feature",
    name: "Marketing media feature",
    description: "A split image and copy block for explaining a product advantage.",
    industry: "marketing",
    purpose: "media_feature",
    tags: ["marketing", "image", "feature"],
    pageKey: "product",
    content: {
      type: "media_feature",
      variant: "image-right",
      settings: {
        style: { textSize: "large", cardStyle: "flat", colorScheme: "brand", imageRadius: "medium" },
        layout: { desktopArrangement: "split", mobileArrangement: "image-top", imagePosition: "right", entranceAnimation: "fade-up" },
        imageSpecs: { imagePath: { width: 1536, height: 1024, source: "sectionImageSpec" } }
      },
      content: {
        eyebrow: "Product focus",
        title: "Show the product in context",
        lead: "Pair a short product story with a visual so visitors understand the value without reading a long page.",
        imagePath: "",
        imageUrl: "",
        imageAlt: "Product feature preview",
        items: [
          ["Clear entry points", "Help teams find the module that matches their scenario."],
          ["Connected operations", "Keep documents, support, and updates close to the product story."]
        ]
      }
    }
  },
  {
    id: "system-marketing-trust-data",
    name: "Marketing trust data",
    description: "A compact trust bar for numbers, coverage, and proof points.",
    industry: "marketing",
    purpose: "trust_data",
    tags: ["marketing", "trust", "metrics"],
    pageKey: "home",
    content: {
      type: "trust_bar",
      variant: "four",
      settings: {
        style: { textSize: "medium", colorScheme: "neutral" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 4 }
      },
      content: {
        ariaLabel: "Product trust indicators",
        items: [
          ["4", "public languages"],
          ["24h", "content review rhythm"],
          ["5MB", "managed image asset limit"],
          ["132", "build routes checked"]
        ]
      }
    }
  },
  {
    id: "system-marketing-cta-band",
    name: "Marketing CTA band",
    description: "A focused call-to-action block for downloads or contact conversion.",
    industry: "marketing",
    purpose: "cta",
    tags: ["marketing", "cta", "conversion"],
    pageKey: null,
    content: {
      type: "cta_band",
      variant: "dark",
      settings: {
        style: { textSize: "large", buttonStyle: "solid", colorScheme: "brand" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", contentAlign: "center", entranceAnimation: "fade" }
      },
      content: {
        eyebrow: "Ready to continue",
        title: "Move from evaluation to supported rollout",
        lead: "Give visitors a clear next action after they understand the product.",
        primaryCta: "Download Aifar",
        primaryHref: "/downloads/",
        secondaryCta: "Contact the team",
        secondaryHref: "/contact/"
      }
    }
  },
  {
    id: "system-tourism-visual-intro",
    name: "Tourism visual intro",
    description: "A large visual introduction block for destination or venue storytelling.",
    industry: "tourism",
    purpose: "visual_intro",
    tags: ["tourism", "hero", "story"],
    pageKey: "home",
    content: {
      type: "hero",
      variant: "split",
      settings: {
        style: { textSize: "large", buttonStyle: "solid", colorScheme: "green" },
        layout: { desktopArrangement: "background", mobileArrangement: "image-top", entranceAnimation: "fade" },
        imageSpecs: { heroImagePath: { width: 1536, height: 864, source: "sectionImageSpec" } }
      },
      content: {
        eyebrow: "Destination story",
        title: "Open with a place visitors can remember",
        lead: "Use a strong image, short copy, and simple actions to guide visitors into the experience.",
        primaryCta: "Explore highlights",
        primaryHref: "/product/",
        secondaryCta: "Plan a visit",
        secondaryHref: "/contact/",
        heroImagePath: "",
        heroImageUrl: "",
        heroAlt: "Destination overview"
      }
    }
  },
  {
    id: "system-tourism-destination-grid",
    name: "Tourism destination grid",
    description: "A card grid for destinations, venues, or experience categories.",
    industry: "tourism",
    purpose: "destination_grid",
    tags: ["tourism", "cards", "destinations"],
    pageKey: null,
    content: {
      type: "card_grid",
      variant: "four",
      settings: {
        style: { cardStyle: "shadow", iconStyle: "line", colorScheme: "green" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 4, hoverIn: "lift", hoverOut: "reset" }
      },
      content: {
        title: "Featured places and experiences",
        lead: "Group destinations into simple cards so visitors can choose a path quickly.",
        items: [
          ["01", "Landmarks", "Important places and public-facing highlights."],
          ["02", "Events", "Timely activities, exhibitions, and guided programs."],
          ["03", "Routes", "Suggested paths for different visitor needs."],
          ["04", "Services", "Practical information, contact, and support entries."]
        ]
      }
    }
  },
  {
    id: "system-tourism-itinerary-steps",
    name: "Tourism itinerary steps",
    description: "A step-by-step itinerary block for route or visit planning.",
    industry: "tourism",
    purpose: "itinerary",
    tags: ["tourism", "itinerary", "steps"],
    pageKey: null,
    content: {
      type: "workflow_steps",
      variant: "numbered",
      settings: {
        tone: "alt",
        style: { cardStyle: "outlined", colorScheme: "green" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 3, entranceAnimation: "stagger" }
      },
      content: {
        title: "Plan the visit in clear steps",
        lead: "Turn a trip, route, or venue visit into a simple sequence.",
        items: [
          ["1", "Choose interest", "Start from the theme or service that fits the visitor."],
          ["2", "Follow the route", "Show the recommended order and supporting information."],
          ["3", "Get help", "Keep contact and support paths visible for the next action."]
        ]
      }
    }
  },
  {
    id: "system-tourism-activity-list",
    name: "Tourism activity list",
    description: "A list block for activities, news, or seasonal travel updates.",
    industry: "tourism",
    purpose: "activity_list",
    tags: ["tourism", "activities", "updates"],
    pageKey: "home",
    content: {
      type: "updates_list",
      variant: "list",
      settings: {
        style: { cardStyle: "flat", colorScheme: "green" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", entranceAnimation: "fade" }
      },
      content: {
        title: "Current activities",
        actionLabel: "View all updates",
        actionHref: "/whats-new/",
        items: [
          ["Guided introduction", "A short program for first-time visitors and teams.", "Program"],
          ["Seasonal highlight", "Feature timely content without rebuilding the page.", "Seasonal"],
          ["Visitor support", "Keep practical support and contact information close.", "Support"]
        ]
      }
    }
  },
  {
    id: "system-corporate-capability-matrix",
    name: "Corporate capability matrix",
    description: "A matrix block for comparing core enterprise capabilities.",
    industry: "corporate",
    purpose: "capability_matrix",
    tags: ["corporate", "capability", "matrix"],
    pageKey: "product",
    content: {
      type: "capability_matrix",
      variant: "three",
      settings: {
        tone: "alt",
        style: { cardStyle: "outlined", iconStyle: "line", colorScheme: "blue" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 3, hoverIn: "lift", hoverOut: "reset" }
      },
      content: {
        title: "Core capabilities for managed teams",
        lead: "Organize enterprise value into a structured matrix for quick evaluation.",
        items: [
          ["01", "Collaboration", "Communication, meetings, documents, and workflows stay connected."],
          ["02", "Operations", "Admins manage content, releases, support, and service paths."],
          ["03", "Governance", "Permissions, records, and published content remain reviewable."]
        ]
      }
    }
  },
  {
    id: "system-corporate-case-proof",
    name: "Corporate case proof",
    description: "A side-by-side scenario block for customer or operating proof.",
    industry: "corporate",
    purpose: "case_proof",
    tags: ["corporate", "cases", "proof"],
    pageKey: "product",
    content: {
      type: "scenario_split",
      variant: "two",
      settings: {
        style: { textSize: "medium", cardStyle: "shadow", colorScheme: "brand" },
        layout: { desktopArrangement: "split", mobileArrangement: "single-column", cardColumns: 2, entranceAnimation: "fade-up" }
      },
      content: {
        eyebrow: "Operating fit",
        title: "Show where Aifar fits the organization",
        lead: "Compare two common scenarios so decision makers can recognize their own needs.",
        items: [
          ["Government operations", "Coordinate departments, requests, documents, and support in a managed workspace."],
          ["Enterprise teams", "Keep product communication, client access, and service records connected."]
        ]
      }
    }
  },
  {
    id: "system-corporate-news-resources",
    name: "Corporate news resources",
    description: "A resource list for company updates, release notes, or documents.",
    industry: "corporate",
    purpose: "news_resources",
    tags: ["corporate", "resources", "updates"],
    pageKey: "home",
    content: {
      type: "updates_list",
      variant: "list",
      settings: {
        style: { cardStyle: "flat", colorScheme: "neutral" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", entranceAnimation: "fade" }
      },
      content: {
        title: "Company resources and updates",
        actionLabel: "View all",
        actionHref: "/whats-new/",
        items: [
          ["Release note", "Summarize product updates and client-facing changes.", "Update"],
          ["Documentation", "Guide visitors to product and deployment materials.", "Docs"],
          ["Support notice", "Keep important service information easy to find.", "Support"]
        ]
      }
    }
  },
  {
    id: "system-corporate-contact-entry",
    name: "Corporate contact entry",
    description: "A contact and support entry block for enterprise website footers or conversion areas.",
    industry: "corporate",
    purpose: "contact_entry",
    tags: ["corporate", "contact", "support"],
    pageKey: null,
    content: {
      type: "support_entry",
      variant: "four",
      settings: {
        tone: "alt",
        anchorId: "contact-entry",
        style: { cardStyle: "outlined", iconStyle: "line", colorScheme: "brand" },
        layout: { desktopArrangement: "stacked", mobileArrangement: "single-column", cardColumns: 4, hoverIn: "lift", hoverOut: "reset" }
      },
      content: {
        title: "Choose the right next step",
        lead: "Provide clear contact, documentation, and support paths without sending visitors to a generic form.",
        items: [
          ["Q", "Product inquiry", "Discuss scenarios, fit, and rollout planning.", "/contact/?type=product_inquiry", "product_inquiry"],
          ["T", "Technical support", "Submit account, installation, client, or product usage issues.", "/contact/?type=technical_support", "technical_support"],
          ["D", "Documentation", "Read product guides and technical materials.", "/docs/", ""],
          ["S", "Security review", "Review security, governance, and deployment context.", "/product/#security", ""]
        ]
      }
    }
  }
];

function normalizeSystemTemplate(definition) {
  const normalized = sectionTemplateRules.normalizeSectionTemplateInput({
    ...definition,
    source: "system",
    status: "ready"
  });

  return {
    id: definition.id,
    pageKey: definition.pageKey || "",
    name: normalized.name,
    description: normalized.description,
    industry: normalized.industry,
    purpose: normalized.purpose,
    tags: normalized.tags,
    source: "system",
    status: "ready",
    riskFlags: [],
    content: normalized.content,
    isFavorite: false,
    archivedAt: null,
    usageCount: 0,
    createdBy: null,
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
    isSystem: true
  };
}

const SYSTEM_SITE_SECTION_TEMPLATES = SYSTEM_SECTION_TEMPLATE_DEFINITIONS.map(normalizeSystemTemplate);

function isSystemSectionTemplateId(value) {
  return String(value || "").startsWith("system-");
}

function normalizeSystemFilter(value, allowedValues) {
  const item = String(value || "").trim();
  return allowedValues.includes(item) ? item : "";
}

function systemTemplateMatches(template, filters = {}) {
  const source = normalizeSystemFilter(filters.source, sectionTemplateRules.SECTION_TEMPLATE_SOURCES);
  const industry = normalizeSystemFilter(filters.industry, sectionTemplateRules.SECTION_TEMPLATE_INDUSTRIES);
  const pageKey = String(filters.pageKey || "").trim();

  if (source && source !== "system") return false;
  if (industry && template.industry !== industry) return false;
  if (pageKey && template.pageKey && template.pageKey !== pageKey) return false;
  return true;
}

function listSystemSectionTemplates(filters = {}) {
  const locale = String(filters.locale || "en").trim() || "en";
  return SYSTEM_SITE_SECTION_TEMPLATES
    .filter((template) => systemTemplateMatches(template, filters))
    .map((template) => ({
      ...template,
      locale,
      content: JSON.parse(JSON.stringify(template.content))
    }));
}

function getSystemSectionTemplate(id, filters = {}) {
  return listSystemSectionTemplates(filters).find((template) => template.id === id) || null;
}

function mergeSectionTemplateLists(databaseTemplates = [], filters = {}) {
  const source = normalizeSystemFilter(filters.source, sectionTemplateRules.SECTION_TEMPLATE_SOURCES);
  const systemTemplates = source === "manual" || source === "ai"
    ? []
    : listSystemSectionTemplates(filters);
  return [...systemTemplates, ...databaseTemplates.map((template) => ({
    ...template,
    isSystem: Boolean(template.isSystem)
  }))];
}

module.exports = {
  SYSTEM_SITE_SECTION_TEMPLATES,
  getSystemSectionTemplate,
  isSystemSectionTemplateId,
  listSystemSectionTemplates,
  mergeSectionTemplateLists
};
