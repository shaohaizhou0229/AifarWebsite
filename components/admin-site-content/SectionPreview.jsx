import { SITE_SECTION_LABELS } from "@/lib/site-page-builder";

function getRows(section, minColumns = 1) {
  const rows = Array.isArray(section?.content?.items) ? section.content.items : [];
  return rows
    .filter(Array.isArray)
    .map((row) => row.map((cell) => (typeof cell === "string" ? cell.trim() : cell)))
    .filter((row) => row.slice(0, minColumns).some(Boolean));
}

function getTitle(section, labels) {
  return labels.sectionTypes?.[section.type] || SITE_SECTION_LABELS[section.type] || section.type;
}

export function SectionMiniPreview({ section, labels }) {
  const content = section?.content || {};
  const rows = getRows(section, 1).slice(0, 4);
  const title = content.title || content.eyebrow || getTitle(section, labels);

  if (section?.type === "hero") {
    return (
      <div className="section-mini-preview mini-hero">
        <span>{content.eyebrow || labels.heroPreviewEyebrow}</span>
        <strong>{content.title || labels.emptyPreview}</strong>
        <p>{content.lead || labels.previewLeadFallback}</p>
      </div>
    );
  }

  if (section?.type === "trust_bar") {
    return (
      <div className="section-mini-preview mini-stats">
        {rows.map(([value, label], index) => (
          <span key={`${value}-${index}`}>{value || label || "-"}</span>
        ))}
      </div>
    );
  }

  if (section?.type === "media_feature") {
    return (
      <div className="section-mini-preview mini-media">
        <div>
          <strong>{title}</strong>
          <p>{content.lead || labels.previewLeadFallback}</p>
        </div>
        <span>{content.imageUrl || content.imagePath ? labels.imageReady : labels.noImage}</span>
      </div>
    );
  }

  if (section?.type === "workflow_steps") {
    return (
      <div className="section-mini-preview mini-steps">
        {rows.slice(0, 3).map(([step, rowTitle], index) => (
          <span key={`${rowTitle}-${index}`}>{step || index + 1}</span>
        ))}
      </div>
    );
  }

  if (section?.type === "download_panel") {
    return (
      <div className="section-mini-preview mini-download">
        <strong>{title}</strong>
        <span>{content.primaryCta || labels.publish}</span>
      </div>
    );
  }

  return (
    <div className="section-mini-preview">
      <strong>{title}</strong>
      <div className="mini-lines">
        {rows.length ? rows.slice(0, 3).map((row, index) => <span key={`${row.join("-")}-${index}`} />) : <span />}
      </div>
    </div>
  );
}

export function TemplateMiniPreview({ content, labels }) {
  const sections = Array.isArray(content?.sections) ? content.sections.slice(0, 5) : [];
  return (
    <div className="template-mini-preview" aria-hidden="true">
      {sections.length ? sections.map((section) => (
        <span className={`template-preview-line line-${section.type}`} key={section.id || section.type} />
      )) : <span className="template-preview-line" />}
      <small>{sections.length ? `${sections.length} ${labels.sections}` : labels.previewUnavailable}</small>
    </div>
  );
}
