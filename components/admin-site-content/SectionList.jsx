import { SITE_SECTION_LABELS } from "@/lib/site-page-builder";

export function SectionList({ labels, sections, selectedSection, onSelect, onDragStart, onDrop, onMove, onRemove }) {
  return (
    <section className="builder-panel builder-list-panel">
      <div className="builder-panel-head">
        <p className="eyebrow">{labels.sections}</p>
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
            <span className="drag-handle" aria-hidden="true">::</span>
            <span>
              <strong>{labels.sectionTypes?.[section.type] || SITE_SECTION_LABELS[section.type]}</strong>
              <small>{section.content?.title || section.content?.eyebrow || section.id}</small>
            </span>
            <span className="builder-card-actions">
              <button type="button" onClick={(event) => { event.stopPropagation(); onMove(index, index - 1); }} title={labels.moveUp}>{labels.moveUp}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onMove(index, index + 1); }} title={labels.moveDown}>{labels.moveDown}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(section.id); }} title={labels.removeSection}>{labels.removeSection}</button>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
