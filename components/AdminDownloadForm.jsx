"use client";

import { useRef, useState } from "react";
import * as tus from "tus-js-client";

async function calculateSha256(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function AdminDownloadForm({ platform, labels }) {
  const release = platform.release;
  const [form, setForm] = useState({
    version: release.version,
    buildNumber: release.buildNumber,
    releaseNotes: release.releaseNotes,
    externalUrl: release.externalUrl,
    isPublished: release.isPublished
  });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(release.uploadStatus === "uploading" ? "interrupted" : "idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(file?.size || 0);
  const uploadRef = useRef(null);

  const phaseText = {
    idle: labels.uploadStatusIdle || "Ready to upload",
    preparing: labels.uploadStatusPreparing || "Preparing file and checksum...",
    uploading: labels.uploadStatusUploading || "Uploading file...",
    paused: labels.uploadStatusPaused || "Upload paused",
    finalizing: labels.uploadStatusFinalizing || "Finalizing release file...",
    complete: labels.uploadStatusComplete || "Upload complete",
    interrupted: labels.uploadStatusInterrupted || "Previous upload did not finish",
    failed: labels.uploadStatusFailed || "Upload failed"
  };

  const showUploadPanel = uploadPhase !== "idle" || release.uploadStatus === "uploading";
  const animatedProgress = uploadPhase === "preparing" || uploadPhase === "uploading" || uploadPhase === "finalizing";

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function saveRelease(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/downloads/${platform.key}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.saveFailed);
      }

      setMessage(labels.saved);
      window.location.reload();
    } catch (saveError) {
      setError(saveError.message || labels.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(event) {
    event.preventDefault();
    if (uploadPaused && uploadRef.current) {
      setUploading(true);
      setUploadPaused(false);
      setUploadPhase("uploading");
      setMessage("");
      setError("");
      uploadRef.current.start();
      return;
    }

    if (!file) {
      setError(labels.fileRequired);
      return;
    }

    setUploading(true);
    setUploadPaused(false);
    setUploadPhase("preparing");
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(file.size);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/downloads/${platform.key}/upload-session/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream"
        })
      });
      const session = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(session.error || labels.uploadFailed);
      }

      await new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: session.endpoint,
          chunkSize: session.chunkSize,
          retryDelays: [0, 1000, 3000, 5000],
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: session.headers || {},
          metadata: {
            bucketName: session.bucket,
            objectName: session.storagePath,
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600"
          },
          onError(uploadError) {
            reject(uploadError);
          },
          onProgress(bytesUploaded, bytesTotal) {
            setUploadPhase("uploading");
            setUploadedBytes(bytesUploaded);
            setTotalBytes(bytesTotal);
            setUploadProgress(bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0);
          },
          async onSuccess() {
            try {
              setUploadPhase("finalizing");
              const checksumSha256 = await calculateSha256(file);
              const completeResponse = await fetch(`/api/admin/downloads/${platform.key}/upload-complete/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  storagePath: session.storagePath,
                  fileSize: file.size,
                  checksumSha256,
                  originalFilename: file.name,
                  contentType: file.type || "application/octet-stream"
                })
              });
              const completeData = await completeResponse.json().catch(() => ({}));

              if (!completeResponse.ok) {
                throw new Error(completeData.error || labels.uploadFailed);
              }

              resolve();
            } catch (completeError) {
              reject(completeError);
            }
          }
        });

        uploadRef.current = upload;
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        }).catch(reject);
      });

      setUploadProgress(100);
      setUploadPhase("complete");
      setMessage(labels.uploaded);
      window.location.reload();
    } catch (uploadError) {
      if (!uploadPaused) {
        setUploadPhase("failed");
      }
      setError(uploadError.message || labels.uploadFailed);
    } finally {
      setUploading(false);
      if (!uploadPaused) {
        setUploadPaused(false);
      }
    }
  }

  function pauseUpload() {
    uploadRef.current?.abort();
    setUploading(false);
    setUploadPaused(true);
    setUploadPhase("paused");
  }

  return (
    <div className="detail-layout">
      {showUploadPanel ? (
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
            {totalBytes ? ` · ${uploadedBytes ? `${Math.round(uploadedBytes / 1024 / 1024)} MB / ` : ""}${Math.round(totalBytes / 1024 / 1024)} MB` : ""}
          </p>
        </section>
      ) : null}

      <form className="admin-actions" onSubmit={saveRelease}>
        <div className="field">
          <label htmlFor="version">{labels.version}</label>
          <input id="version" name="version" value={form.version} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="buildNumber">{labels.buildNumber}</label>
          <input id="buildNumber" name="buildNumber" value={form.buildNumber} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="externalUrl">{labels.externalUrl}</label>
          <input id="externalUrl" name="externalUrl" value={form.externalUrl} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="releaseNotes">{labels.releaseNotes}</label>
          <textarea id="releaseNotes" name="releaseNotes" value={form.releaseNotes} onChange={updateField} />
        </div>
        <label className="checkbox-line">
          <input name="isPublished" type="checkbox" checked={form.isPublished} onChange={updateField} />
          <span>{labels.published}</span>
        </label>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? labels.saving : labels.save}
        </button>
      </form>

      <form className="admin-actions" onSubmit={uploadFile}>
        <div className="field">
          <label htmlFor="releaseFile">{labels.file}</label>
          <input
            id="releaseFile"
            type="file"
            accept=".exe,.msi,.dmg,.pkg,.apk,.zip"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setFile(nextFile);
              setTotalBytes(nextFile?.size || 0);
              setUploadProgress(0);
              setUploadedBytes(0);
              setUploadPhase("idle");
            }}
          />
        </div>
        <p className="muted-line">{labels.fileHint}</p>
        {release.uploadStatus ? <p className="muted-line">Upload status: {release.uploadStatus}</p> : null}
        {uploading || uploadPaused || uploadProgress > 0 ? (
          <div className="upload-progress">
            <progress value={uploadProgress} max="100" />
            <span>{uploadProgress}%</span>
          </div>
        ) : null}
        <div className="card-actions">
          <button className="button secondary" type="submit" disabled={uploading}>
            {uploading ? labels.uploading : uploadPaused ? "Resume upload" : labels.upload}
          </button>
          {uploading ? (
            <button className="button secondary" type="button" onClick={pauseUpload}>
              Pause
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  );
}
