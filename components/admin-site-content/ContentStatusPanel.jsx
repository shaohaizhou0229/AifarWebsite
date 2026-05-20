import { formatDate } from "./form-utils";

export function ContentStatusPanel({ labels, currentPage, entry, locale, publishing, disabled, onPublish }) {
  return (
    <div className="cms-status-panel">
      <div>
        <p className="eyebrow">{labels.status}</p>
        <h3>{currentPage.label}</h3>
        <p className="muted-line">
          {entry?.isPublished ? labels.publishedStatus : labels.draftStatus}
          {entry?.updatedAt ? ` | ${labels.updatedAt}: ${formatDate(entry.updatedAt, locale)}` : ""}
          {entry?.publishedAt ? ` | ${labels.publishedAt}: ${formatDate(entry.publishedAt, locale)}` : ""}
        </p>
      </div>
      <button className="button secondary" type="button" onClick={onPublish} disabled={disabled}>
        {publishing ? labels.publishing : labels.publish}
      </button>
    </div>
  );
}
