"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, RefreshCw, Search, X } from "lucide-react";
import { SITE_SECTION_LABELS, createBlankSection } from "@/lib/site-page-builder";
import sectionTemplateUi from "@/lib/section-template-ui.cjs";
import { SitePageSections } from "@/components/SitePageSections";

const {
  TEMPLATE_INDUSTRY_FILTERS,
  createTemplatePreviewPage,
  filterSectionTemplates
} = sectionTemplateUi;

const STRUCTURE_GROUPS = [
  { key: "hero", types: ["hero"] },
  { key: "navigation", types: ["support_entry", "updates_list"] },
  { key: "trust", types: ["trust_bar"] },
  { key: "modules", types: ["card_grid", "module_showcase", "capability_matrix"] },
  { key: "media", types: ["media_feature"] },
  { key: "scenarios", types: ["scenario_split"] },
  { key: "workflow", types: ["workflow_steps"] },
  { key: "security", types: ["security_assurance"] },
  { key: "downloads", types: ["download_panel"] },
  { key: "faq", types: ["faq_band"] },
  { key: "cta", types: ["cta_band"] }
];

function getSectionTitle(type, labels) {
  return labels.sectionTypes?.[type] || SITE_SECTION_LABELS[type] || type;
}

function createPreviewSection(type, labels) {
  const section = createBlankSection(type, `preview-${type}`);
  const title = getSectionTitle(type, labels);
  const lead = labels.previewLeadFallback || "";

  return {
    ...section,
    content: {
      ...(section.content || {}),
      eyebrow: section.content?.eyebrow || title,
      title: section.content?.title || title,
      lead: section.content?.lead || lead,
      primaryCta: section.content?.primaryCta || labels.primaryCta || "",
      secondaryCta: section.content?.secondaryCta || labels.secondaryCta || "",
      ariaLabel: section.content?.ariaLabel || title,
      items: section.content?.items?.length ? section.content.items : [
        [title, lead, ""],
        [labels.itemTitle || title, labels.description || lead, ""]
      ]
    }
  };
}

function getIndustryLabel(labels, industry) {
  return labels.templateIndustries?.[industry] || industry;
}

function getSourceLabel(labels, source) {
  return labels.templateSources?.[source] || source || labels.emptyValue;
}

function getPageLabel(labels, pageKey) {
  if (!pageKey) return labels.templateAllPages || labels.emptyValue;
  if (pageKey === "home") return labels.homePage;
  if (pageKey === "product") return labels.productPage;
  return pageKey;
}

function TemplateCard({ labels, locale, template, onInsertTemplate, onPreviewTemplate }) {
  const previewPage = useMemo(() => createTemplatePreviewPage(template), [template]);

  return (
    <article className="section-library-row template-library-row">
      <button className="section-library-preview" type="button" onClick={() => onPreviewTemplate(template)} aria-label={labels.previewTemplate}>
        <div className="section-library-preview-page">
          <SitePageSections page={previewPage} locale={locale} />
        </div>
      </button>
      <div className="section-library-copy">
        <div className="template-library-meta">
          <span>{getIndustryLabel(labels, template.industry)}</span>
          <span>{getSourceLabel(labels, template.source)}</span>
          <span>{getPageLabel(labels, template.pageKey)}</span>
        </div>
        <strong>{template.name}</strong>
        <p>{template.description || template.purpose || labels.addSection}</p>
      </div>
      <div className="template-library-actions">
        <button className="button secondary compact" type="button" onClick={() => onPreviewTemplate(template)}>
          <Eye size={15} aria-hidden="true" />
          {labels.previewTemplate}
        </button>
        <button className="button primary compact" type="button" onClick={() => onInsertTemplate(template)}>
          <Plus size={15} aria-hidden="true" />
          {labels.insertBlock}
        </button>
      </div>
    </article>
  );
}

export function SectionSidebar({
  labels,
  locale,
  sectionTemplates = [],
  sectionTemplatesLoading = false,
  sectionTemplatesError = "",
  onReloadSectionTemplates,
  onAddSection,
  onInsertTemplate,
  onPreviewTemplate
}) {
  const [libraryMode, setLibraryMode] = useState("templates");
  const [popoverOpen, setPopoverOpen] = useState(true);
  const [activeGroupKey, setActiveGroupKey] = useState("");
  const [activeIndustry, setActiveIndustry] = useState("all");
  const [templateQuery, setTemplateQuery] = useState("");
  const closeTimerRef = useRef(null);
  const activeGroup = useMemo(
    () => activeGroupKey ? STRUCTURE_GROUPS.find((group) => group.key === activeGroupKey) : null,
    [activeGroupKey]
  );
  const filteredTemplates = useMemo(
    () => filterSectionTemplates(sectionTemplates, { industry: activeIndustry, query: templateQuery }),
    [sectionTemplates, activeIndustry, templateQuery]
  );

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openTemplateLibrary(industry = activeIndustry) {
    clearCloseTimer();
    setLibraryMode("templates");
    setActiveGroupKey("");
    setActiveIndustry(industry);
    setPopoverOpen(true);
  }

  function openBlockLibrary(groupKey) {
    clearCloseTimer();
    setLibraryMode("blocks");
    setActiveGroupKey(groupKey);
    setPopoverOpen(true);
  }

  function closeLibrary() {
    clearCloseTimer();
    setPopoverOpen(false);
    setActiveGroupKey("");
  }

  function scheduleCloseLibrary() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setPopoverOpen(false);
      setActiveGroupKey("");
      closeTimerRef.current = null;
    }, 160);
  }

  function insertSection(type) {
    onAddSection(type);
    closeLibrary();
  }

  function insertTemplate(template) {
    onInsertTemplate(template);
    closeLibrary();
  }

  const showTemplatePopover = popoverOpen && libraryMode === "templates";
  const showBlockPopover = popoverOpen && libraryMode === "blocks" && activeGroup;

  return (
    <aside
      className="builder-panel section-structure-panel"
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleCloseLibrary}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeLibrary();
        }
      }}
    >
      <div className="builder-panel-head">
        <div>
          <p className="eyebrow">{labels.webStructure}</p>
          <strong>{labels.blockLibrary}</strong>
        </div>
      </div>
      <div className="section-library-mode-switch" role="tablist" aria-label={labels.blockLibrary}>
        <button
          className={libraryMode === "templates" ? "active" : ""}
          type="button"
          onClick={() => openTemplateLibrary()}
        >
          {labels.templateLibrary}
        </button>
        <button
          className={libraryMode === "blocks" ? "active" : ""}
          type="button"
          onClick={() => openBlockLibrary(activeGroupKey || STRUCTURE_GROUPS[0].key)}
        >
          {labels.basicBlocks}
        </button>
      </div>
      <nav className="site-structure-list" aria-label={labels.webStructure}>
        {libraryMode === "templates" ? TEMPLATE_INDUSTRY_FILTERS.map((industry) => (
          <button
            className={industry === activeIndustry ? "active" : ""}
            type="button"
            key={industry}
            onMouseEnter={() => openTemplateLibrary(industry)}
            onFocus={() => openTemplateLibrary(industry)}
            onClick={() => openTemplateLibrary(industry)}
          >
            {getIndustryLabel(labels, industry)}
          </button>
        )) : STRUCTURE_GROUPS.map((group) => (
          <button
            className={group.key === activeGroupKey ? "active" : ""}
            type="button"
            key={group.key}
            onMouseEnter={() => openBlockLibrary(group.key)}
            onFocus={() => openBlockLibrary(group.key)}
            onClick={() => openBlockLibrary(group.key)}
          >
            {labels.sectionCategories?.[group.key] || group.key}
          </button>
        ))}
      </nav>

      {showTemplatePopover ? (
        <div
          className="section-library-popover template-library-popover"
          role="region"
          aria-label={labels.templateLibrary}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleCloseLibrary}
        >
          <header className="section-library-head template-library-head">
            <div>
              <p className="eyebrow">{getIndustryLabel(labels, activeIndustry)}</p>
              <strong>{labels.chooseTemplate}</strong>
            </div>
            <div className="template-library-head-actions">
              <button className="icon-button" type="button" onClick={onReloadSectionTemplates} title={labels.templateRetry} aria-label={labels.templateRetry}>
                <RefreshCw size={15} aria-hidden="true" />
              </button>
              <button className="icon-button" type="button" onClick={closeLibrary} title={labels.closePreview} aria-label={labels.closePreview}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </header>
          <div className="template-library-search">
            <Search size={15} aria-hidden="true" />
            <input
              aria-label={labels.searchTemplates}
              value={templateQuery}
              placeholder={labels.searchTemplates}
              onChange={(event) => setTemplateQuery(event.target.value)}
            />
          </div>
          <div className="section-library-list">
            {sectionTemplatesLoading ? (
              <p className="muted-line">{labels.templateLoading}</p>
            ) : null}
            {!sectionTemplatesLoading && sectionTemplatesError ? (
              <div className="template-library-state">
                <p className="form-message error">{sectionTemplatesError}</p>
                <button className="button secondary compact" type="button" onClick={onReloadSectionTemplates}>
                  <RefreshCw size={15} aria-hidden="true" />
                  {labels.templateRetry}
                </button>
              </div>
            ) : null}
            {!sectionTemplatesLoading && !sectionTemplatesError && filteredTemplates.length ? filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                labels={labels}
                locale={locale}
                template={template}
                onInsertTemplate={insertTemplate}
                onPreviewTemplate={onPreviewTemplate}
              />
            )) : null}
            {!sectionTemplatesLoading && !sectionTemplatesError && !filteredTemplates.length ? (
              <p className="muted-line">{labels.templateEmpty}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showBlockPopover ? (
        <div
          className="section-library-popover"
          role="region"
          aria-label={labels.blockLibrary}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleCloseLibrary}
        >
          <header className="section-library-head">
            <div>
              <p className="eyebrow">{labels.sectionCategories?.[activeGroup.key] || activeGroup.key}</p>
              <strong>{labels.chooseBlock}</strong>
            </div>
            <button className="icon-button" type="button" onClick={closeLibrary} title={labels.closePreview} aria-label={labels.closePreview}>
              <X size={15} aria-hidden="true" />
            </button>
          </header>
          <div className="section-library-list">
            {activeGroup.types.map((type) => {
              const previewSection = createPreviewSection(type, labels);
              return (
                <article className="section-library-row" key={type}>
                  <div className="section-library-preview" aria-hidden="true">
                    <div className="section-library-preview-page">
                      <SitePageSections page={{ sections: [previewSection] }} locale={locale} />
                    </div>
                  </div>
                  <div className="section-library-copy">
                    <strong>{getSectionTitle(type, labels)}</strong>
                    <p>{labels.sectionDescriptions?.[type] || labels.addSection}</p>
                  </div>
                  <button className="button primary compact" type="button" onClick={() => insertSection(type)}>
                    <Plus size={15} aria-hidden="true" />
                    {labels.insertBlock}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
