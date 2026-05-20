import { getUploadStatusLabel } from "@/i18n/labels";

export function ReleaseFilePanel({
  release,
  labels,
  file,
  fileInputRef,
  uploading,
  uploadPaused,
  cancelling,
  deletingFile,
  serverUploadStatus,
  onSelectFile,
  onResetSelectedFile,
  onDeleteReleaseFile,
  onUploadFile,
  onPauseUpload,
  onCancelUpload
}) {
  return (
    <form className="admin-actions release-file-panel" onSubmit={onUploadFile}>
      {release.storagePath ? (
        <div className="file-management">
          <div>
            <p className="eyebrow">{labels.currentWebFile || "Current web file"}</p>
            <h3>{release.originalFilename || release.storagePath}</h3>
            <p className="muted-line">{labels.currentWebFileHint || "This is the file visitors will download after the platform is published."}</p>
            {release.fileSize ? <p className="muted-line">{Math.round(release.fileSize / 1024 / 1024)} MB</p> : null}
          </div>
          <button className="button secondary danger" type="button" onClick={onDeleteReleaseFile} disabled={deletingFile || uploading}>
            {deletingFile ? (labels.deletingFile || "Deleting...") : (labels.deleteFile || "Delete current file")}
          </button>
        </div>
      ) : (
        <div className="file-management">
          <div>
            <p className="eyebrow">{labels.currentWebFile || "Current web file"}</p>
            <h3>{labels.noCurrentFile || "No file uploaded"}</h3>
            <p className="muted-line">{labels.noCurrentFileHint || "Upload a package file before publishing this platform."}</p>
          </div>
        </div>
      )}

      <div className="upload-workflow">
        <div>
          <p className="eyebrow">{labels.replacementFile || "Replacement file"}</p>
          <h3>{file ? file.name : (labels.chooseReplacement || "Choose a package to upload")}</h3>
          <p className="muted-line">
            {labels.replacementHint || "Choosing a file does not change the current web file. It only replaces the web file after upload completes."}
          </p>
        </div>
        <div className="upload-picker">
          <input
            ref={fileInputRef}
            id="releaseFile"
            className="file-input"
            type="file"
            accept=".exe,.msi,.dmg,.pkg,.apk,.zip"
            onChange={(event) => onSelectFile(event.target.files?.[0] || null)}
          />
          <label className="button secondary" htmlFor="releaseFile">
            {file ? (labels.changeFile || "Change file") : (labels.chooseFile || "Choose file")}
          </label>
          {file ? (
            <button className="button secondary" type="button" onClick={onResetSelectedFile} disabled={uploading}>
              {labels.clearSelectedFile || "Clear selection"}
            </button>
          ) : null}
        </div>
      </div>

      {file ? (
        <div className="selected-file">
          <div>
            <strong>{labels.selectedFile || "Selected file"}</strong>
            <p className="muted-line">{file.name}</p>
          </div>
          <span>{Math.round(file.size / 1024 / 1024)} MB</span>
        </div>
      ) : null}

      <p className="muted-line">{labels.fileHint}</p>
      {serverUploadStatus ? <p className="muted-line">{labels.uploadStatus}: {getUploadStatusLabel(labels, serverUploadStatus)}</p> : null}
      <div className="card-actions">
        <button className="button primary" type="submit" disabled={uploading || (!file && !uploadPaused)}>
          {uploading ? labels.uploading : uploadPaused ? labels.resumeUpload : (labels.uploadReplacement || labels.upload)}
        </button>
        {uploading ? (
          <button className="button secondary" type="button" onClick={onPauseUpload}>
            {labels.pauseUpload}
          </button>
        ) : null}
        {uploading || uploadPaused ? (
          <button className="button secondary" type="button" onClick={onCancelUpload} disabled={cancelling}>
            {cancelling ? (labels.cancellingUpload || "Cancelling...") : (labels.cancelUpload || "Cancel upload")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
