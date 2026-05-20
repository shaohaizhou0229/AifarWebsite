"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";

async function calculateSha256(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getUploadErrorMessage(error, labels) {
  const message = error?.message || "";
  if (message.includes("Maximum size exceeded") || message.includes("413")) {
    return labels.uploadTooLarge || "The file exceeds the current Supabase Storage upload limit. Increase the Storage global file size limit or upload a smaller file.";
  }
  return message || labels.uploadFailed;
}

export function useReleaseUpload({ platform, release, labels, setMessage, setError }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [serverUploadStatus, setServerUploadStatus] = useState(release.uploadStatus || "idle");
  const [uploadPhase, setUploadPhase] = useState(release.uploadStatus === "uploading" ? "interrupted" : "idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(file?.size || 0);
  const [cancelling, setCancelling] = useState(false);
  const uploadRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadPausedRef = useRef(false);

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

  const showUploadPanel = uploadPhase !== "idle" || serverUploadStatus === "uploading";
  const animatedProgress = uploadPhase === "preparing" || uploadPhase === "uploading" || uploadPhase === "finalizing";

  function setPaused(value) {
    uploadPausedRef.current = value;
    setUploadPaused(value);
  }

  async function setRemoteUploadStatus(uploadStatus) {
    const response = await fetch(`/api/admin/downloads/${platform.key}/upload-status/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadStatus })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || labels.uploadFailed);
    }

    setServerUploadStatus(data.release?.uploadStatus || uploadStatus);
    return data.release;
  }

  function resetSelectedFile() {
    setFile(null);
    setTotalBytes(0);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadPhase("idle");
    if (serverUploadStatus !== "uploading") {
      setServerUploadStatus(release.uploadStatus || "idle");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectFile(nextFile) {
    setFile(nextFile);
    setTotalBytes(nextFile?.size || 0);
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadPhase("idle");
    setServerUploadStatus(release.uploadStatus || "idle");
    setMessage("");
    setError("");
  }

  async function uploadFile(event) {
    event.preventDefault();
    if (uploadPausedRef.current && uploadRef.current) {
      setUploading(true);
      setPaused(false);
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
    setPaused(false);
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

      setServerUploadStatus("uploading");
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
      router.refresh();
    } catch (uploadError) {
      if (!uploadPausedRef.current) {
        setUploadPhase("failed");
        setServerUploadStatus(release.uploadStatus || "idle");
      }
      setError(getUploadErrorMessage(uploadError, labels));
    } finally {
      setUploading(false);
      if (!uploadPausedRef.current) {
        setPaused(false);
      }
    }
  }

  function pauseUpload() {
    uploadRef.current?.abort();
    setUploading(false);
    setPaused(true);
    setUploadPhase("paused");
  }

  async function cancelUpload() {
    setCancelling(true);
    setMessage("");
    setError("");

    try {
      if (uploadRef.current) {
        await uploadRef.current.abort(true).catch(() => uploadRef.current.abort());
      }
      await setRemoteUploadStatus("idle");
      uploadRef.current = null;
      setUploading(false);
      setPaused(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      setUploadPhase("idle");
      setMessage(labels.uploadCancelled || "Upload cancelled.");
    } catch (cancelError) {
      setError(cancelError.message || labels.uploadFailed);
    } finally {
      setCancelling(false);
    }
  }

  return {
    file,
    fileInputRef,
    uploading,
    uploadPaused,
    serverUploadStatus,
    uploadPhase,
    uploadProgress,
    uploadedBytes,
    totalBytes,
    cancelling,
    phaseText,
    showUploadPanel,
    animatedProgress,
    resetSelectedFile,
    selectFile,
    uploadFile,
    pauseUpload,
    cancelUpload
  };
}
