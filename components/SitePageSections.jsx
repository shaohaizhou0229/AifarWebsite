import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/Card";
import { Release } from "@/components/Rows";
import sectionSettingControls from "@/lib/section-setting-controls.cjs";
import { localizedPath } from "@/i18n/routing";

const { getSectionRenderAttributes } = sectionSettingControls;

function resolveHref(locale, href = "") {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) return href;
  return localizedPath(locale, href);
}

function isClientRoutableHref(href = "") {
  return href.startsWith("/") && !href.startsWith("/api/");
}

function SiteActionLink({ className, href, children, ...props }) {
  if (!href) return null;
  if (isClientRoutableHref(href)) {
    return <Link className={className} href={href} {...props}>{children}</Link>;
  }
  return <a className={className} href={href} {...props}>{children}</a>;
}

function hasText(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function cleanRows(items, minColumns = 1) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(Array.isArray)
    .map((row) => row.map((cell) => (typeof cell === "string" ? cell.trim() : cell)))
    .filter((row) => row.slice(0, minColumns).some(hasText));
}

function sectionRootProps(section, baseClassName = "section") {
  const renderAttributes = getSectionRenderAttributes(section);
  return {
    className: [
      baseClassName,
      section?.settings?.tone === "alt" ? "alt" : "",
      renderAttributes.className
    ].filter(Boolean).join(" "),
    ...renderAttributes.attributes
  };
}

function columnClass(section, fallback) {
  const columns = Number(section?.settings?.layout?.cardColumns || 0);
  if ([1, 2, 3, 4].includes(columns)) return `columns-${columns}`;
  return fallback;
}

function SectionHead({ title, lead, actionLabel, actionHref, locale }) {
  if (!title && !lead && !actionLabel) return null;
  return (
    <div className="section-head">
      <div>
        {title ? <h2>{title}</h2> : null}
        {lead ? <p>{lead}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <SiteActionLink className="button secondary" href={resolveHref(locale, actionHref)}>{actionLabel}</SiteActionLink>
      ) : null}
    </div>
  );
}

function HeroSection({ section, locale }) {
  const content = section.content || {};
  const hasActions = content.primaryCta || content.secondaryCta;
  const hasImage = content.heroImageUrl || content.heroImagePath;
  const imageSrc = content.heroImageUrl || content.heroImagePath;

  if (section.variant === "simple") {
    return (
      <section {...sectionRootProps(section, "page-hero")}>
        <div className="section-inner">
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          <h1>{content.title}</h1>
          {content.lead ? <p className="lead">{content.lead}</p> : null}
          {hasActions ? (
            <div className="actions">
              {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
              {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
            </div>
          ) : null}
          {hasImage ? (
            <div className="hero-media product-page-media simple-hero-media">
              <img src={imageSrc} alt={content.heroAlt || content.title || ""} />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section {...sectionRootProps(section, "hero home-hero")} style={{ "--home-hero-image": `url("${imageSrc || "/assets/images/aifar-hero.png"}")` }}>
      <div className="section-inner hero-grid home-hero-grid">
        <div className="hero-copy">
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          <h1>{content.title}</h1>
          {content.lead ? <p className="lead">{content.lead}</p> : null}
          {hasActions ? (
            <div className="actions">
              {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
              {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
            </div>
          ) : null}
        </div>
        {hasImage ? (
          <div className="hero-media product-stage">
            <img src={imageSrc} alt={content.heroAlt || content.title || ""} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TrustBarSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  if (!items.length) return null;

  return (
    <section {...sectionRootProps(section, "section section-tight")}>
      <div className="section-inner trust-row" aria-label={content.ariaLabel || undefined}>
        {items.map(([value, label], index) => (
          <div key={`${value}-${index}`}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardGridSection({ section, locale }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 2);
  const columns = columnClass(section, section.variant === "three" ? "three" : "four");

  return (
    <section {...sectionRootProps(section, "section ai-layout-section")}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} actionLabel={content.actionLabel} actionHref={content.actionHref} locale={locale} />
        <div className={`grid ${columns}`}>
          {items.map(([icon, title, description], index) => (
            <Card icon={icon} title={title} key={`${title}-${index}`}>{description}</Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureListSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} />
        <div className="feature-list">
          {items.map(([title, description], index) => (
            <div className="feature" key={`${title}-${index}`}>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaFeatureSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  const isImageOnly = section.variant === "image-only";
  const imageSrc = content.imageUrl || content.imagePath;

  if (isImageOnly && !imageSrc) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        {isImageOnly ? (
          <div className="hero-media product-page-media">
            <img src={imageSrc} alt={content.imageAlt || content.title || ""} />
          </div>
        ) : (
          <div className="media-feature">
            <div>
              {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
              {content.title ? <h2>{content.title}</h2> : null}
              {content.lead ? <p>{content.lead}</p> : null}
              {items.length ? (
                <div className="feature-list compact">
                  {items.map(([title, description], index) => (
                    <div className="feature" key={`${title}-${index}`}>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {imageSrc ? (
              <div className="hero-media">
                <img src={imageSrc} alt={content.imageAlt || content.title || ""} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function ScenarioSplitSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  if (!content.title && !content.lead && !items.length) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner scenario-split">
        <div>
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          {content.title ? <h2>{content.title}</h2> : null}
          {content.lead ? <p>{content.lead}</p> : null}
        </div>
        <div className="scenario-card-grid">
          {items.map(([title, description], index) => (
            <article className="scenario-card" key={`${title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              {description ? <p>{description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowStepsSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 2);
  if (!content.title && !items.length) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} />
        <div className="workflow-steps">
          {items.map(([step, title, description], index) => (
            <article className="workflow-step" key={`${title}-${index}`}>
              <span>{step || String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              {description ? <p>{description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModuleShowcaseSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  if (!content.title && !items.length) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} />
        <div className="module-showcase-grid">
          {items.map(([title, description], index) => (
            <article className="module-showcase-card" key={`${title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              {description ? <p>{description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecurityAssuranceSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  if (!content.title && !items.length) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner security-assurance">
        <div>
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          {content.title ? <h2>{content.title}</h2> : null}
          {content.lead ? <p>{content.lead}</p> : null}
        </div>
        <div className="security-checklist">
          {items.map(([title, description], index) => (
            <article key={`${title}-${index}`}>
              <span aria-hidden="true">OK</span>
              <div>
                <h3>{title}</h3>
                {description ? <p>{description}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadPanelSection({ section, locale }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  if (!content.title && !content.primaryCta && !items.length) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner download-panel-section">
        <div>
          {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
          {content.title ? <h2>{content.title}</h2> : null}
          {content.lead ? <p>{content.lead}</p> : null}
          <div className="actions">
            {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
            {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
          </div>
        </div>
        <div className="download-panel-list">
          {items.map(([title, description], index) => (
            <article key={`${title}-${index}`}>
              <strong>{title}</strong>
              {description ? <span>{description}</span> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqBandSection({ section }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);
  if (!content.title && !items.length) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} />
        <div className="faq-band-list">
          {items.map(([question, answer], index) => (
            <article key={`${question}-${index}`}>
              <h3>{question}</h3>
              {answer ? <p>{answer}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportEntrySection({ section, locale }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 2);
  const columns = columnClass(section, section.variant === "three" ? "three" : "four");
  const anchorId = section.settings?.anchorId || undefined;

  return (
    <section {...sectionRootProps(section)} id={anchorId}>
      <div className="section-inner">
        <SectionHead title={content.title} lead={content.lead} />
        <div className={`support-entry-grid grid ${columns}`}>
          {items.map(([icon, title, description, href, requestType], index) => {
            const actionHref = href || (requestType ? `/contact/?type=${requestType}` : "");
            if (!actionHref) {
              return (
                <article className="support-entry-card card" key={`${title}-${index}`}>
                  <span className="icon">{icon}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              );
            }
            return (
              <SiteActionLink className="support-entry-card card" href={resolveHref(locale, actionHref)} key={`${title}-${index}`}>
                <span className="icon">{icon}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </SiteActionLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UpdatesSection({ section, locale }) {
  const content = section.content || {};
  const items = cleanRows(content.items, 1);

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        <SectionHead title={content.title} actionLabel={content.actionLabel} actionHref={content.actionHref} locale={locale} />
        <div className="release-list">
          {items.map(([title, description, pill], index) => (
            <Release title={title} description={description} pill={pill} key={`${title}-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ section, locale }) {
  const content = section.content || {};
  if (!content.eyebrow && !content.title && !content.lead && !content.primaryCta && !content.secondaryCta) return null;

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner cta-band">
        {content.eyebrow ? <p className="eyebrow">{content.eyebrow}</p> : null}
        <h2>{content.title}</h2>
        {content.lead ? <p>{content.lead}</p> : null}
        <div className="actions">
          {content.primaryCta ? <SiteActionLink className="button primary" href={resolveHref(locale, content.primaryHref)}>{content.primaryCta}</SiteActionLink> : null}
          {content.secondaryCta ? <SiteActionLink className="button secondary" href={resolveHref(locale, content.secondaryHref)}>{content.secondaryCta}</SiteActionLink> : null}
        </div>
      </div>
    </section>
  );
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function percent(value) {
  return `${Math.round(value * 10000) / 100}%`;
}

function aiElementBoxStyle(element = {}) {
  const box = element.box || {};
  const x = clampNumber(box.x, 0, 0, 0.98);
  const y = clampNumber(box.y, 0, 0, 0.98);
  let width = clampNumber(box.width, 0.2, 0.02, 1);
  let height = clampNumber(box.height, 0.1, 0.02, 1);
  if (x + width > 1) width = Math.max(0.02, 1 - x);
  if (y + height > 1) height = Math.max(0.02, 1 - y);

  return {
    left: percent(x),
    top: percent(y),
    width: percent(width),
    height: percent(height),
    zIndex: String(Math.min(20, Math.max(0, Number(element.zIndex || 0))))
  };
}

function aiElementAttributes(element = {}) {
  const appearance = element.appearance || {};
  const attrs = {};
  for (const [key, attr] of [
    ["textSize", "data-ai-size"],
    ["weight", "data-ai-weight"],
    ["align", "data-ai-align"],
    ["tone", "data-ai-tone"],
    ["radius", "data-ai-radius"]
  ]) {
    if (appearance[key]) attrs[attr] = String(appearance[key]);
  }
  return attrs;
}

function AiLayoutElement({ element, locale }) {
  const type = element?.type || "";
  const className = `ai-layout-element ai-layout-${type}`;
  const attrs = aiElementAttributes(element);
  const style = aiElementBoxStyle(element);

  if (type === "button") {
    const label = element.text || "";
    if (!label) return null;
    const button = <span>{label}</span>;
    return element.href ? (
      <SiteActionLink className={className} href={resolveHref(locale, element.href)} style={style} {...attrs}>{button}</SiteActionLink>
    ) : (
      <span className={className} style={style} {...attrs}>{button}</span>
    );
  }

  if (type === "image") {
    const imageSrc = element.imageUrl || element.imagePath || "";
    return (
      <div className={className} style={style} {...attrs}>
        {imageSrc ? <img src={imageSrc} alt={element.alt || ""} /> : <span>{element.alt || ""}</span>}
      </div>
    );
  }

  if (type === "icon") {
    return (
      <span className={className} style={style} aria-label={element.label || undefined} {...attrs}>
        {element.icon || element.label || ""}
      </span>
    );
  }

  return (
    <div className={className} style={style} {...attrs}>
      {element.text || ""}
    </div>
  );
}

function AiLayoutSection({ section, locale }) {
  const content = section.content || {};
  const canvas = content.canvas || {};
  const elements = Array.isArray(content.elements) ? content.elements : [];
  const aspectRatio = clampNumber(canvas.aspectRatio, 1.6, 0.45, 3.2);

  return (
    <section {...sectionRootProps(section)}>
      <div className="section-inner">
        <div
          className="ai-layout-canvas"
          data-ai-background={canvas.background || "default"}
          data-ai-padding={canvas.padding || "normal"}
          data-ai-max-width={canvas.maxWidth || "content"}
          data-mobile-mode={canvas.mobileMode || "scale"}
          style={{ "--ai-layout-aspect": String(aspectRatio) }}
        >
          {elements.map((element, index) => (
            <AiLayoutElement element={element} locale={locale} key={element.id || `${element.type}-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SitePageSections({
  page,
  locale,
  editorMode = false,
  labels = {},
  selectedSectionId = "",
  hoveredSectionId = "",
  onSelectSection,
  onHoverSection,
  onMoveSection,
  onDuplicateSection,
  onRemoveSection,
  onInsertAfterSection,
  onDragStartSection,
  onDropSection
}) {
  const sections = Array.isArray(page?.sections) ? page.sections : [];

  function renderSection(section) {
    if (section.type === "hero") return <HeroSection section={section} locale={locale} key={section.id} />;
    if (section.type === "trust_bar") return <TrustBarSection section={section} key={section.id} />;
    if (section.type === "card_grid" || section.type === "capability_matrix") return <CardGridSection section={section} locale={locale} key={section.id} />;
    if (section.type === "feature_list") return <FeatureListSection section={section} key={section.id} />;
    if (section.type === "media_feature") return <MediaFeatureSection section={section} key={section.id} />;
    if (section.type === "scenario_split") return <ScenarioSplitSection section={section} key={section.id} />;
    if (section.type === "workflow_steps") return <WorkflowStepsSection section={section} key={section.id} />;
    if (section.type === "module_showcase") return <ModuleShowcaseSection section={section} key={section.id} />;
    if (section.type === "security_assurance") return <SecurityAssuranceSection section={section} key={section.id} />;
    if (section.type === "download_panel") return <DownloadPanelSection section={section} locale={locale} key={section.id} />;
    if (section.type === "faq_band") return <FaqBandSection section={section} key={section.id} />;
    if (section.type === "support_entry") return <SupportEntrySection section={section} locale={locale} key={section.id} />;
    if (section.type === "updates_list") return <UpdatesSection section={section} locale={locale} key={section.id} />;
    if (section.type === "cta_band") return <CtaSection section={section} locale={locale} key={section.id} />;
    if (section.type === "ai_layout") return <AiLayoutSection section={section} locale={locale} key={section.id} />;
    return null;
  }

  return (
    <>
      {sections.map((section, index) => {
        const renderedSection = renderSection(section);
        if (!renderedSection) return null;
        if (!editorMode) return renderedSection;
        const sectionId = section.id || `${section.type}-${index}`;
        const isActive = sectionId === selectedSectionId;
        const isHovered = sectionId === hoveredSectionId;
        const label = labels.sectionTypes?.[section.type] || section.type;
        return (
          <div
            className={`cms-canvas-section${isActive ? " selected" : ""}${isHovered ? " hovered" : ""}`}
            key={sectionId}
            role="button"
            tabIndex={0}
            draggable
            onClick={(event) => {
              event.preventDefault();
              onSelectSection?.(sectionId);
            }}
            onDragStart={() => onDragStartSection?.(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDropSection?.(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectSection?.(sectionId);
              }
            }}
            onMouseEnter={() => onHoverSection?.(sectionId)}
            onMouseLeave={() => onHoverSection?.("")}
          >
            <span className="cms-canvas-section-label">{label}</span>
            {isActive ? (
              <div className="cms-canvas-toolbar" aria-label={labels.canvasTools}>
                <button type="button" disabled={index === 0} onClick={(event) => { event.stopPropagation(); onMoveSection?.(index, index - 1); }} title={labels.moveUp} aria-label={labels.moveUp}>
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button type="button" disabled={index === sections.length - 1} onClick={(event) => { event.stopPropagation(); onMoveSection?.(index, index + 1); }} title={labels.moveDown} aria-label={labels.moveDown}>
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateSection?.(sectionId); }} title={labels.duplicateSection} aria-label={labels.duplicateSection}>
                  <Copy size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onInsertAfterSection?.(sectionId, section.type); }} title={labels.insertBelow} aria-label={labels.insertBelow}>
                  <Plus size={14} aria-hidden="true" />
                </button>
                <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); onRemoveSection?.(sectionId); }} title={labels.removeSection} aria-label={labels.removeSection}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}
            {renderedSection}
          </div>
        );
      })}
    </>
  );
}
