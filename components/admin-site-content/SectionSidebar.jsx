"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { SITE_SECTION_LABELS, createBlankSection } from "@/lib/site-page-builder";
import { SitePageSections } from "@/components/SitePageSections";

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

export function SectionSidebar({ labels, locale, onAddSection }) {
  const [activeGroupKey, setActiveGroupKey] = useState("");
  const closeTimerRef = useRef(null);
  const activeGroup = useMemo(
    () => activeGroupKey ? STRUCTURE_GROUPS.find((group) => group.key === activeGroupKey) : null,
    [activeGroupKey]
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

  function openGroup(groupKey) {
    clearCloseTimer();
    setActiveGroupKey(groupKey);
  }

  function closeLibrary() {
    clearCloseTimer();
    setActiveGroupKey("");
  }

  function scheduleCloseLibrary() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveGroupKey("");
      closeTimerRef.current = null;
    }, 160);
  }

  function insertSection(type) {
    onAddSection(type);
    closeLibrary();
  }

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
      <nav className="site-structure-list" aria-label={labels.webStructure}>
        {STRUCTURE_GROUPS.map((group) => (
          <button
            className={group.key === activeGroupKey ? "active" : ""}
            type="button"
            key={group.key}
            onMouseEnter={() => openGroup(group.key)}
            onFocus={() => openGroup(group.key)}
            onClick={() => openGroup(group.key)}
          >
            {labels.sectionCategories?.[group.key] || group.key}
          </button>
        ))}
      </nav>

      {activeGroup ? (
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
