"use client";

import { useState } from "react";

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
    if (!file) {
      setError(labels.fileRequired);
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/downloads/${platform.key}/file/`, {
        method: "POST",
        body
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.uploadFailed);
      }

      setMessage(labels.uploaded);
      window.location.reload();
    } catch (uploadError) {
      setError(uploadError.message || labels.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="detail-layout">
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
          <input id="releaseFile" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </div>
        <p className="muted-line">{labels.fileHint}</p>
        <button className="button secondary" type="submit" disabled={uploading}>
          {uploading ? labels.uploading : labels.upload}
        </button>
      </form>

      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  );
}
