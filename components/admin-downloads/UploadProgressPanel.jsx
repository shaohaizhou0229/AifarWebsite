import { formatMessage } from "@/i18n/labels";

export function UploadProgressPanel({
  labels,
  release,
  file,
  uploadPhase,
  uploadProgress,
  uploadedBytes,
  totalBytes,
  phaseText,
  showUploadPanel,
  animatedProgress,
  cancelling,
  onCancelUpload
}) {
  if (!showUploadPanel) return null;

  return (
    <section className={`upload-live-panel ${animatedProgress ? "is-active" : ""}`} aria-live="polite">
      <div className="upload-live-head">
        <div>
          <p className="eyebrow">{labels.uploadProgressTitle || "Upload progress"}</p>
          <h3>{phaseText[uploadPhase] || phaseText.idle}</h3>
        </div>
        <strong>{uploadPhase === "preparing" || uploadPhase === "finalizing" ? "..." : `${uploadProgress}%`}</strong>
      </div>
      <div
        className={`upload-meter ${uploadPhase === "preparing" || uploadPhase === "finalizing" ? "is-indeterminate" : ""}`}
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={uploadPhase === "preparing" || uploadPhase === "finalizing" || uploadPhase === "interrupted" ? undefined : uploadProgress}
      >
        <span style={{ width: `${Math.max(uploadProgress, animatedProgress ? 6 : 0)}%` }} />
      </div>
      <p className="muted-line">
        {uploadPhase === "interrupted" ? (labels.uploadInterruptedHint || "Choose the same file and start upload again to continue.") : file?.name || release.originalFilename || release.storagePath || ""}
        {totalBytes ? ` ${formatMessage(labels.uploadSizeProgress, {
          uploaded: uploadedBytes ? `${Math.round(uploadedBytes / 1024 / 1024)} MB / ` : "",
          total: Math.round(totalBytes / 1024 / 1024)
        })}` : ""}
      </p>
      <div className="card-actions">
        <button className="button secondary" type="button" onClick={onCancelUpload} disabled={cancelling}>
          {cancelling ? (labels.cancellingUpload || "Cancelling...") : (labels.cancelUpload || "Cancel upload")}
        </button>
      </div>
    </section>
  );
}
