import { GripVertical, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { SITE_SECTION_LABELS } from "@/lib/site-page-builder";
import { SectionMiniPreview } from "./SectionPreview";

export function SectionList({ labels, sections, selectedSection, onSelect, onDragStart, onDrop, onMove, onRemove }) {
  return (
    <section className="builder-panel builder-list-panel">
      <div className="builder-panel-head">
        <div>
          <p className="eyebrow">{labels.pageBlueprint || labels.sections}</p>
          <strong>{labels.blueprintLead}</strong>
        </div>
        <span>{sections.length}</span>
      </div>
      <div className="builder-section-list">
        {sections.map((section, index) => (
          <article
            className={`builder-section-card${section.id === selectedSection?.id ? " active" : ""}`}
            key={section.id}
            draggable
            onClick={() => onSelect(section.id)}
            onDragStart={() => onDragStart(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(index)}
          >
            <span className="drag-handle" aria-hidden="true"><GripVertical size={16} /></span>
            <SectionMiniPreview section={section} labels={labels} />
            <span>
              <strong>{labels.sectionTypes?.[section.type] || SITE_SECTION_LABELS[section.type]}</strong>
              <small>{section.content?.title || section.content?.eyebrow || section.id}</small>
            </span>
            <span className="builder-card-actions">
              <button type="button" disabled={index === 0} onClick={(event) => { event.stopPropagation(); onMove(index, index - 1); }} title={labels.moveUp}>
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button type="button" disabled={index === sections.length - 1} onClick={(event) => { event.stopPropagation(); onMove(index, index + 1); }} title={labels.moveDown}>
                <ArrowDown size={14} aria-hidden="true" />
              </button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(section.id); }} title={labels.removeSection}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
