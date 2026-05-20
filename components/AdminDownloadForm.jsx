"use client";

import { useState } from "react";
import { ReleaseDetailsForm } from "@/components/admin-downloads/ReleaseDetailsForm";
import { ReleaseFilePanel } from "@/components/admin-downloads/ReleaseFilePanel";
import { UploadProgressPanel } from "@/components/admin-downloads/UploadProgressPanel";
import { useReleaseUpload } from "@/components/admin-downloads/useReleaseUpload";

export function AdminDownloadForm({ platform, labels }) {
  const release = platform.release;
  const [form, setForm] = useState({
    version: release.version,
    buildNumber: release.buildNumber,
    releaseNotes: release.releaseNotes,
    externalUrl: release.externalUrl,
    isPublished: release.isPublished
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const releaseUpload = useReleaseUpload({ platform, release, labels, setMessage, setError });

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

  async function deleteReleaseFile() {
    const confirmed = window.confirm(labels.deleteFileConfirm || "Delete the current release file? This will unpublish this platform.");
    if (!confirmed) return;

    setDeletingFile(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/downloads/${platform.key}/file/`, {
        method: "DELETE"
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || labels.deleteFileFailed || labels.uploadFailed);
      }

      setMessage(labels.fileDeleted || "Release file deleted.");
      window.location.reload();
    } catch (deleteError) {
      setError(deleteError.message || labels.deleteFileFailed || labels.uploadFailed);
    } finally {
      setDeletingFile(false);
    }
  }

  return (
    <div className="detail-layout">
      <UploadProgressPanel
        labels={labels}
        release={release}
        file={releaseUpload.file}
        uploadPhase={releaseUpload.uploadPhase}
        uploadProgress={releaseUpload.uploadProgress}
        uploadedBytes={releaseUpload.uploadedBytes}
        totalBytes={releaseUpload.totalBytes}
        phaseText={releaseUpload.phaseText}
        showUploadPanel={releaseUpload.showUploadPanel}
        animatedProgress={releaseUpload.animatedProgress}
        cancelling={releaseUpload.cancelling}
        onCancelUpload={releaseUpload.cancelUpload}
      />

      <ReleaseDetailsForm labels={labels} form={form} saving={saving} onChange={updateField} onSubmit={saveRelease} />

      <ReleaseFilePanel
        release={release}
        labels={labels}
        file={releaseUpload.file}
        fileInputRef={releaseUpload.fileInputRef}
        uploading={releaseUpload.uploading}
        uploadPaused={releaseUpload.uploadPaused}
        cancelling={releaseUpload.cancelling}
        deletingFile={deletingFile}
        serverUploadStatus={releaseUpload.serverUploadStatus}
        onSelectFile={releaseUpload.selectFile}
        onResetSelectedFile={releaseUpload.resetSelectedFile}
        onDeleteReleaseFile={deleteReleaseFile}
        onUploadFile={releaseUpload.uploadFile}
        onPauseUpload={releaseUpload.pauseUpload}
        onCancelUpload={releaseUpload.cancelUpload}
      />

      {message ? <p className="form-message success">{message}</p> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  );
}
