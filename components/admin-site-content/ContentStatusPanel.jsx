import { formatDate } from "./form-utils";

export function ContentStatusPanel({ labels, currentPage, entry, locale, saving, publishing, disabled, onPublish, showAction = true }) {
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
      {showAction ? (
        <button className="button secondary" type="button" onClick={onPublish} disabled={disabled}>
          {publishing ? labels.publishing : saving ? labels.saving : labels.publishCurrentPreview || labels.publish}
        </button>
      ) : null}
    </div>
  );
}
