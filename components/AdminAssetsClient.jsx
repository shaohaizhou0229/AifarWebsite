"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Tag,
  UploadCloud,
  X
} from "lucide-react";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import imageGenerationRules from "@/lib/image-generation-settings-core.cjs";

const DEFAULT_ASSET_LIMIT = 24;
const ASSET_PAGE_SIZE_OPTIONS = [24, 48];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const SOURCE_OPTIONS = ["upload", "folder_upload", "generated"];
const SUPPORTED_UPLOAD_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "svg"]);
const { closestImageSizeForSpec, parseImageSize } = imageGenerationRules;

function t(labels, key) {
  return labels?.[key] || key;
}

function formatTemplate(template = "", values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
}

function formatBytes(bytes, labels) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} ${labels.units?.mb || "MB"}`;
  if (size >= 1024) return `${Math.ceil(size / 1024)} ${labels.units?.kb || "KB"}`;
  return `${size} ${labels.units?.bytes || "B"}`;
}

function formatDate(value, locale) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function splitTags(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTags(tags = []) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function localizeAdminHref(locale, href = "") {
  if (!href.startsWith("/admin/")) return href;
  return `/${locale}${href}`;
}

function fileExtension(filename = "") {
  const cleanName = String(filename || "").trim();
  return cleanName.includes(".") ? cleanName.split(".").pop().toLowerCase() : "";
}

function validateUploadFile(file) {
  if (!file?.name) return "missingName";
  if (!SUPPORTED_UPLOAD_EXTENSIONS.has(fileExtension(file.name))) return "unsupportedType";
  if (!file.size || file.size > MAX_UPLOAD_SIZE) return "tooLarge";
  return "ok";
}

function validationMessage(labels, code) {
  return labels.validation?.[code] || labels.validation?.uploadFailed || code;
}

function makeTaskId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRelativePath(value = "") {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function getVisiblePages(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
    .reduce((items, page, index, list) => {
      if (index > 0 && page - list[index - 1] > 1) items.push(`gap-${page}`);
      items.push(page);
      return items;
    }, []);
}

function AssetLibraryCard({ asset, labels, locale, selected, checked, onSelect, onToggle }) {
  return (
    <article className={`admin-asset-card ${selected ? "selected" : ""}`}>
      <label className="admin-asset-check" title={t(labels, "selectForBatch")}>
        <input aria-label={t(labels, "selectForBatch")} checked={checked} name={`assetSelection-${asset.id}`} type="checkbox" onChange={() => onToggle(asset.id)} />
        <span aria-hidden="true">{checked ? <CheckSquare size={14} /> : null}</span>
      </label>
      <button type="button" onClick={() => onSelect(asset)} aria-label={t(labels, "viewAssetDetails")}>
        <span className="admin-asset-thumb">
          {asset.url ? <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} width={asset.width || 320} height={asset.height || 240} loading="lazy" /> : <ImageIcon size={28} aria-hidden="true" />}
        </span>
        <span className="admin-asset-copy">
          <strong title={asset.displayName || asset.originalFilename}>{asset.displayName || asset.originalFilename}</strong>
          <small>{[asset.directoryPath || t(labels, "uncategorized"), labels.sourceLabels?.[asset.source] || asset.source].filter(Boolean).join(" / ")}</small>
          <small>{[formatBytes(asset.fileSize, labels), formatDate(asset.updatedAt, locale)].filter(Boolean).join(" / ")}</small>
        </span>
      </button>
    </article>
  );
}

function AssetFolderPanel({ labels, folderItems, total, directory, onChange }) {
  const [folderQuery, setFolderQuery] = useState("");
  const visibleFolders = useMemo(() => {
    const needle = folderQuery.trim().toLowerCase();
    if (!needle) return folderItems;
    return folderItems.filter((folder) => `${folder.displayName || ""} ${folder.directoryPath || ""}`.toLowerCase().includes(needle));
  }, [folderItems, folderQuery]);

  return (
    <aside className="admin-asset-folders">
      <div className="admin-asset-panel-head">
        <strong>{t(labels, "foldersPanelTitle")}</strong>
        <span>{formatTemplate(t(labels, "folderCountSummary"), { count: folderItems.length })}</span>
      </div>
      <label className="admin-asset-folder-search">
        <Search size={14} aria-hidden="true" />
        <input autoComplete="off" name="assetFolderSearch" value={folderQuery} placeholder={t(labels, "folderSearchPlaceholder")} onChange={(event) => setFolderQuery(event.target.value)} />
      </label>
      <div className="admin-asset-folder-list">
        <button className={!directory ? "active" : ""} type="button" onClick={() => onChange("")}>
          <FolderOpen size={15} aria-hidden="true" />
          <span>{t(labels, "allDirectories")}</span>
          <small>{total}</small>
        </button>
        {visibleFolders.map((folder) => (
          <button className={directory === folder.directoryPath ? "active" : ""} type="button" key={folder.directoryPath} onClick={() => onChange(folder.directoryPath)}>
            <FolderOpen size={15} aria-hidden="true" />
            <span>{folder.displayName || folder.directoryPath}</span>
            <small>{folder.assetCount}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function AssetDetail({ asset, labels, locale, folders, saving, usageState, onSave }) {
  const [draft, setDraft] = useState({ displayName: "", altText: "", directoryPath: "", tags: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft({
      displayName: asset?.displayName || asset?.originalFilename || "",
      altText: asset?.altText || "",
      directoryPath: asset?.directoryPath || "",
      tags: joinTags(asset?.tags)
    });
    setCopied(false);
  }, [asset]);

  async function copyAssetUrl() {
    if (!asset?.url || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(asset.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!asset) {
    return (
      <aside className="admin-asset-detail empty">
        <ImageIcon size={24} aria-hidden="true" />
        <p>{t(labels, "selectAssetHint")}</p>
      </aside>
    );
  }

  const metadata = asset.metadata || {};

  return (
    <aside className="admin-asset-detail">
      <div className="admin-asset-detail-hero">
        <div className="admin-asset-preview">
          <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} width={asset.width || 320} height={asset.height || 240} />
        </div>
        <div className="admin-asset-detail-actions">
          <button className="button secondary compact" type="button" onClick={copyAssetUrl} disabled={!asset.url}>
            <Copy size={14} aria-hidden="true" />
            {copied ? t(labels, "copyLinkSuccess") : t(labels, "copyLink")}
          </button>
          {asset.url ? (
            <a className="button secondary compact" href={asset.url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} aria-hidden="true" />
              {t(labels, "previewOriginal")}
            </a>
          ) : null}
        </div>
        <dl className="admin-asset-meta">
          <div>
            <dt>{t(labels, "source")}</dt>
            <dd>{labels.sourceLabels?.[asset.source] || asset.source}</dd>
          </div>
          <div>
            <dt>{t(labels, "size")}</dt>
            <dd>{asset.width && asset.height ? `${asset.width} x ${asset.height}` : formatBytes(asset.fileSize, labels)}</dd>
          </div>
          <div>
            <dt>{t(labels, "updatedAt")}</dt>
            <dd>{formatDate(asset.updatedAt, locale) || "-"}</dd>
          </div>
        </dl>
      </div>
      <label className="asset-field">
        <span>{t(labels, "displayName")}</span>
        <input autoComplete="off" name="assetDisplayName" value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "altText")}</span>
        <input autoComplete="off" name="assetAltText" value={draft.altText} onChange={(event) => setDraft((current) => ({ ...current, altText: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "directoryPath")}</span>
        <select name="assetDirectoryPath" value={draft.directoryPath} onChange={(event) => setDraft((current) => ({ ...current, directoryPath: event.target.value }))}>
          <option value="">{t(labels, "uncategorized")}</option>
          {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
        </select>
      </label>
      <label className="asset-field">
        <span>{t(labels, "tags")}</span>
        <input autoComplete="off" name="assetTags" value={draft.tags} placeholder={t(labels, "tagNamePlaceholder")} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
      </label>
      <button className="button primary compact" type="button" onClick={() => onSave(asset, { ...draft, tags: splitTags(draft.tags) })} disabled={saving || !draft.displayName.trim()}>
        {saving ? t(labels, "saving") : t(labels, "saveMetadata")}
      </button>

      {asset.source === "generated" ? (
        <section className="admin-asset-info-block">
          <span className="admin-eyebrow">{t(labels, "generationHistory")}</span>
          <p>{metadata.prompt || asset.altText || t(labels, "notProvided")}</p>
          <small>{[metadata.targetSize ? formatTemplate(t(labels, "targetSizeChip"), { size: metadata.targetSize }) : "", metadata.size ? formatTemplate(t(labels, "serviceSizeChip"), { size: metadata.size }) : "", metadata.quality].filter(Boolean).join(" / ")}</small>
        </section>
      ) : null}

      <section className="admin-asset-info-block">
        <span className="admin-eyebrow">{t(labels, "usageTitle")}</span>
        {usageState?.loading ? (
          <p>{t(labels, "usageLoading")}</p>
        ) : usageState?.error ? (
          <p className="error">{usageState.error}</p>
        ) : usageState?.items?.length ? (
          <ul className="admin-asset-usage-list">
            {usageState.items.map((item) => (
              <li key={item.id}>
                <a href={localizeAdminHref(locale, item.href)}>
                  <strong>{item.title || t(labels, "notProvided")}</strong>
                  <span>
                    {[labels.usageSourceLabels?.[item.sourceType] || item.sourceType, labels.usageStatusLabels?.[item.status] || item.status, item.locale, item.detail].filter(Boolean).join(" / ")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t(labels, "usageNone")}</p>
        )}
      </section>
    </aside>
  );
}

function UploadTaskRow({ task, labels, onRetry, onRemove }) {
  const isWorking = ["preparing", "uploading", "finalizing"].includes(task.status);
  return (
    <li className={`admin-asset-upload-task ${task.status}`}>
      <span className="admin-asset-upload-thumb">
        {task.previewUrl ? <img src={task.previewUrl} alt="" width="48" height="48" /> : <ImageIcon size={18} aria-hidden="true" />}
      </span>
      <span>
        <strong title={task.file.name}>{task.file.name}</strong>
        <small>{[formatBytes(task.file.size, labels), labels.uploadStatuses?.[task.status] || task.status].filter(Boolean).join(" / ")}</small>
        {task.error ? <small className="error">{task.error}</small> : null}
        <span className="admin-asset-progress"><i style={{ width: `${task.progress || 0}%` }} /></span>
      </span>
      {isWorking ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
      {task.status === "failed" ? (
        <button type="button" onClick={() => onRetry(task)} title={t(labels, "retryUpload")} aria-label={t(labels, "retryUpload")}>
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      ) : null}
      {["queued", "failed", "rejected", "completed"].includes(task.status) ? (
        <button type="button" onClick={() => onRemove(task.id)} title={t(labels, "removeUploadTask")} aria-label={t(labels, "removeUploadTask")}>
          <X size={15} aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

function AdminAssetUploadModal({ open, labels, folders, onClose, onUploaded }) {
  const imageInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [defaultFolder, setDefaultFolder] = useState("");
  const [tagText, setTagText] = useState("");
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => () => {
    tasksRef.current.forEach((task) => {
      if (task.previewUrl) URL.revokeObjectURL(task.previewUrl);
    });
  }, []);

  if (!open) return null;

  function updateTask(taskId, patch) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...patch } : task));
  }

  function removeTask(taskId) {
    setTasks((current) => {
      const task = current.find((item) => item.id === taskId);
      if (task?.previewUrl) URL.revokeObjectURL(task.previewUrl);
      return current.filter((item) => item.id !== taskId);
    });
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setTasks((current) => {
      const existing = new Set(current.map((task) => `${task.file.name}-${task.file.size}-${task.file.lastModified}`));
      const nextTasks = incoming.map((file) => {
        const duplicateKey = `${file.name}-${file.size}-${file.lastModified}`;
        const code = existing.has(duplicateKey) ? "duplicate" : validateUploadFile(file);
        existing.add(duplicateKey);
        return {
          id: makeTaskId(file),
          file,
          relativePath: normalizeRelativePath(file.webkitRelativePath || file.name),
          previewUrl: file.type?.startsWith("image/") && file.type !== "image/svg+xml" ? URL.createObjectURL(file) : "",
          status: code === "ok" ? "queued" : "rejected",
          progress: code === "ok" ? 0 : 100,
          error: code === "ok" ? "" : validationMessage(labels, code)
        };
      });
      return [...current, ...nextTasks];
    });
  }

  async function uploadTask(task) {
    const tags = splitTags(tagText);
    const relativePath = normalizeRelativePath(defaultFolder ? `${defaultFolder}/${task.relativePath || task.file.name}` : task.relativePath || task.file.name);
    updateTask(task.id, { status: "preparing", progress: 8, error: "" });
    try {
      const formData = new FormData();
      formData.append("files", task.file);
      formData.append("relativePaths", relativePath);
      updateTask(task.id, { status: "uploading", progress: 45 });
      const response = await fetch("/api/admin/assets/upload/", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      const uploaded = result.results?.[0];
      if (!response.ok || !uploaded?.ok) {
        throw new Error(uploaded?.error || result.error || t(labels, "uploadFailed"));
      }

      let asset = uploaded.asset;
      if (asset?.id && tags.length) {
        updateTask(task.id, { status: "finalizing", progress: 82 });
        const patchResponse = await fetch(`/api/admin/assets/${asset.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: asset.displayName || asset.originalFilename,
            altText: asset.altText || "",
            directoryPath: asset.directoryPath || "",
            tags
          })
        });
        const patchResult = await patchResponse.json().catch(() => ({}));
        if (!patchResponse.ok) throw new Error(patchResult.error || t(labels, "saveFailed"));
        asset = patchResult.asset;
      }

      updateTask(task.id, { status: "completed", progress: 100, asset });
      onUploaded(asset);
    } catch (error) {
      updateTask(task.id, { status: "failed", progress: 100, error: error.message || t(labels, "uploadFailed") });
    }
  }

  function startUploads() {
    tasks.filter((task) => ["queued", "failed"].includes(task.status)).forEach(uploadTask);
  }

  const actionableCount = tasks.filter((task) => ["queued", "failed"].includes(task.status)).length;

  return (
    <div className="admin-asset-modal-backdrop" role="dialog" aria-modal="true" aria-label={t(labels, "uploadLibraryTitle")}>
      <div className="admin-asset-modal">
        <header className="admin-asset-modal-head">
          <div>
            <h2>{t(labels, "uploadLibraryTitle")}</h2>
            <p>{t(labels, "uploadLibraryLead")}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t(labels, "close")}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="admin-asset-upload-layout">
          <section
            className={`admin-asset-upload-drop ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <UploadCloud size={30} aria-hidden="true" />
            <strong>{t(labels, "dropTitle")}</strong>
            <p>{t(labels, "formatHint")}</p>
            <div>
              <button className="button primary compact" type="button" onClick={() => imageInputRef.current?.click()}>
                {t(labels, "browseImages")}
              </button>
              <button className="button secondary compact" type="button" onClick={() => folderInputRef.current?.click()}>
                {t(labels, "browseFolder")}
              </button>
            </div>
            <input ref={imageInputRef} name="assetImageFiles" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" multiple hidden onChange={(event) => addFiles(event.target.files)} />
            <input ref={folderInputRef} name="assetFolderFiles" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" multiple hidden webkitdirectory="" directory="" onChange={(event) => addFiles(event.target.files)} />
          </section>
          <section className="admin-asset-upload-options">
            <label className="asset-field">
              <span>{t(labels, "uploadDefaultFolder")}</span>
              <select name="uploadDefaultFolder" value={defaultFolder} onChange={(event) => setDefaultFolder(event.target.value)}>
                <option value="">{t(labels, "uncategorized")}</option>
                {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
              </select>
            </label>
            <label className="asset-field">
              <span>{t(labels, "uploadTags")}</span>
              <input autoComplete="off" name="uploadTags" value={tagText} placeholder={t(labels, "tagNamePlaceholder")} onChange={(event) => setTagText(event.target.value)} />
            </label>
          </section>
          <section className="admin-asset-upload-queue">
            <div className="admin-asset-panel-head">
              <strong>{t(labels, "uploadQueue")}</strong>
              <span>{formatTemplate(t(labels, "uploadQueueCount"), { count: tasks.length })}</span>
            </div>
            {tasks.length ? (
              <ul>
                {tasks.map((task) => (
                  <UploadTaskRow key={task.id} task={task} labels={labels} onRetry={uploadTask} onRemove={removeTask} />
                ))}
              </ul>
            ) : (
              <p>{t(labels, "uploadQueueEmpty")}</p>
            )}
          </section>
        </div>
        <footer className="admin-asset-modal-actions">
          <button className="button secondary" type="button" onClick={onClose}>{t(labels, "done")}</button>
          <button className="button primary" type="button" onClick={startUploads} disabled={!actionableCount}>
            <UploadCloud size={16} aria-hidden="true" />
            {t(labels, "startUpload")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function AdminAssetGenerateModal({ open, labels, locale, folders, imageSettings, defaultGenerateSize, onClose, onGenerated }) {
  const defaultSize = imageSettings?.defaultSize || defaultGenerateSize || "1024x1024";
  const parsedDefault = parseImageSize(defaultSize);
  const [prompt, setPrompt] = useState("");
  const [targetWidth, setTargetWidth] = useState(parsedDefault.width);
  const [targetHeight, setTargetHeight] = useState(parsedDefault.height);
  const [quality, setQuality] = useState(imageSettings?.defaultQuality || "auto");
  const [directoryPath, setDirectoryPath] = useState("generated");
  const [tagText, setTagText] = useState("generated");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedAsset, setGeneratedAsset] = useState(null);

  useEffect(() => {
    if (!open) return;
    const nextDefault = parseImageSize(defaultSize);
    setTargetWidth(nextDefault.width);
    setTargetHeight(nextDefault.height);
    setQuality(imageSettings?.defaultQuality || "auto");
    setError("");
  }, [defaultSize, imageSettings?.defaultQuality, open]);

  if (!open) return null;

  const configured = Boolean(imageSettings?.configured);
  const safeWidth = clampNumber(targetWidth, 128, 4096, parsedDefault.width);
  const safeHeight = clampNumber(targetHeight, 128, 4096, parsedDefault.height);
  const actualSize = closestImageSizeForSpec({ targetWidth: safeWidth, targetHeight: safeHeight }, defaultSize);

  async function submitGeneration() {
    if (!configured || !prompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/admin/assets/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          promptMode: "manual",
          targetWidth: safeWidth,
          targetHeight: safeHeight,
          size: actualSize,
          sizeSource: "assetLibraryCustom",
          quality,
          directoryPath,
          tags: splitTags(tagText)
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.code === "generationUnavailable" ? t(labels, "generationUnavailable") : result.error || t(labels, "generateFailed"));
      setGeneratedAsset(result.asset);
      onGenerated(result.asset);
    } catch (generateError) {
      setError(generateError.message || t(labels, "generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="admin-asset-modal-backdrop" role="dialog" aria-modal="true" aria-label={t(labels, "generateLibraryTitle")}>
      <div className="admin-asset-modal admin-asset-generate-modal">
        <header className="admin-asset-modal-head">
          <div>
            <h2>{t(labels, "generateLibraryTitle")}</h2>
            <p>{t(labels, "generateLibraryLead")}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t(labels, "close")}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="admin-asset-generate-layout">
          <section className="admin-asset-generate-form">
            {!configured ? (
              <div className="admin-asset-service-warning">
                <AlertCircle size={17} aria-hidden="true" />
                <span>{t(labels, "generationServiceDisabled")}</span>
                <a href={localizeAdminHref(locale, "/admin/settings/ai/")}>
                  <Settings size={14} aria-hidden="true" />
                  {t(labels, "openAiSettings")}
                </a>
              </div>
            ) : null}
            <label className="asset-field">
              <span>{t(labels, "prompt")}</span>
              <textarea autoComplete="off" name="generationPrompt" value={prompt} placeholder={t(labels, "promptPlaceholder")} onChange={(event) => setPrompt(event.target.value)} />
            </label>
            <div className="admin-asset-size-source">
              <span>{t(labels, "targetImageSize")}</span>
              <strong>{labels.targetSizeSourceLabels?.assetLibraryCustom || t(labels, "assetLibraryCustomSize")}</strong>
            </div>
            <div className="admin-asset-size-grid">
              <label className="asset-field">
                <span>{t(labels, "targetWidth")}</span>
                <input inputMode="numeric" name="targetWidth" type="number" min="128" max="4096" step="1" value={targetWidth} onChange={(event) => setTargetWidth(event.target.value)} />
              </label>
              <label className="asset-field">
                <span>{t(labels, "targetHeight")}</span>
                <input inputMode="numeric" name="targetHeight" type="number" min="128" max="4096" step="1" value={targetHeight} onChange={(event) => setTargetHeight(event.target.value)} />
              </label>
            </div>
            <div className="admin-asset-size-result">
              <span>{formatTemplate(t(labels, "targetSizeChip"), { size: `${safeWidth}x${safeHeight}` })}</span>
              <strong>{formatTemplate(t(labels, "serviceSizeChip"), { size: actualSize })}</strong>
              <small>{t(labels, "actualGenerationSize")}</small>
            </div>
            <div className="admin-asset-size-grid">
              <label className="asset-field">
                <span>{t(labels, "quality")}</span>
                <select name="generationQuality" value={quality} onChange={(event) => setQuality(event.target.value)}>
                  {(imageSettings?.supportedQualities || ["auto", "low", "medium", "high"]).map((item) => (
                    <option value={item} key={item}>{labels.qualityLabels?.[item] || item}</option>
                  ))}
                </select>
              </label>
              <label className="asset-field">
                <span>{t(labels, "saveFolder")}</span>
                <select name="generationFolder" value={directoryPath} onChange={(event) => setDirectoryPath(event.target.value)}>
                  <option value="generated">generated</option>
                  {folders.filter((folder) => folder !== "generated").map((folder) => <option value={folder} key={folder}>{folder}</option>)}
                </select>
              </label>
            </div>
            <label className="asset-field">
              <span>{t(labels, "uploadTags")}</span>
              <input autoComplete="off" name="generationTags" value={tagText} placeholder={t(labels, "tagNamePlaceholder")} onChange={(event) => setTagText(event.target.value)} />
            </label>
            {error ? <p className="form-message error" role="alert">{error}</p> : null}
          </section>
          <section className="admin-asset-generated-preview">
            {generating ? (
              <div className="admin-asset-preview-empty">
                <Loader2 className="spin" size={26} aria-hidden="true" />
                <p>{t(labels, "generating")}</p>
              </div>
            ) : generatedAsset?.url ? (
              <>
                <img src={generatedAsset.url} alt={generatedAsset.altText || generatedAsset.displayName || ""} width={generatedAsset.width || 320} height={generatedAsset.height || 320} />
                <strong>{t(labels, "generatedSaved")}</strong>
              </>
            ) : (
              <div className="admin-asset-preview-empty">
                <ImageIcon size={26} aria-hidden="true" />
                <p>{t(labels, "noGeneratedImage")}</p>
              </div>
            )}
          </section>
        </div>
        <footer className="admin-asset-modal-actions">
          <button className="button secondary" type="button" onClick={onClose}>{t(labels, "done")}</button>
          <button className="button primary" type="button" onClick={submitGeneration} disabled={!configured || generating || !prompt.trim()}>
            {generating ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {generating ? t(labels, "generating") : t(labels, "generateAndSave")}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function AdminAssetsClient({ locale, page, assetLabels, initialData = null, loadingLabel, errorLabel, defaultGenerateSize = "1024x1024", imageSettings = null }) {
  const skipInitialFetch = useRef(Boolean(initialData));
  const [data, setData] = useState(initialData || { assets: [], folders: [], folderItems: [], tags: [], total: 0, page: 1, limit: DEFAULT_ASSET_LIMIT });
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(Number(initialData?.limit || DEFAULT_ASSET_LIMIT));
  const [selectedAsset, setSelectedAsset] = useState(initialData?.assets?.[0] || null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkFolder, setBulkFolder] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [usageState, setUsageState] = useState({ assetId: "", loading: false, error: "", items: [] });

  const folders = data.folders || data.directories || [];
  const tags = data.tags || [];
  const checkedIds = useMemo(() => new Set(selectedIds), [selectedIds]);
  const currentPage = Number(data.page || pageNumber || 1);
  const totalPages = Math.max(1, Math.ceil(Number(data.total || 0) / pageSize));
  const generatedVisible = (data.assets || []).filter((asset) => asset.source === "generated").length;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("page", String(pageNumber));
      if (query.trim()) params.set("q", query.trim());
      if (directory) params.set("directory", directory);
      if (source) params.set("source", source);
      if (tag) params.set("tag", tag);
      const response = await fetch(`/api/admin/assets/?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.code === "assetManagerBusy" ? t(assetLabels, "loadBusy") : result.error || errorLabel);
      setData(result);
      setSelectedAsset((current) => {
        if (current && result.assets?.some((asset) => asset.id === current.id)) {
          return result.assets.find((asset) => asset.id === current.id);
        }
        return result.assets?.[0] || null;
      });
    } catch (loadError) {
      setError(loadError.message || errorLabel);
    } finally {
      setLoading(false);
    }
  }, [assetLabels, directory, errorLabel, pageNumber, pageSize, query, source, tag]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return undefined;
    }
    const timer = window.setTimeout(loadAssets, 180);
    return () => window.clearTimeout(timer);
  }, [loadAssets]);

  useEffect(() => {
    setPageNumber(1);
    setSelectedIds([]);
  }, [directory, pageSize, query, source, tag]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const assetId = selectedAsset?.id || "";
    if (!assetId) {
      setUsageState({ assetId: "", loading: false, error: "", items: [] });
      return undefined;
    }

    const controller = new AbortController();
    setUsageState({ assetId, loading: true, error: "", items: [] });

    fetch(`/api/admin/assets/${assetId}/usage/`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || t(assetLabels, "usageLoadFailed"));
        setUsageState({ assetId, loading: false, error: "", items: result.usage || [] });
      })
      .catch((usageError) => {
        if (usageError.name === "AbortError") return;
        setUsageState({ assetId, loading: false, error: usageError.message || t(assetLabels, "usageLoadFailed"), items: [] });
      });

    return () => controller.abort();
  }, [assetLabels, selectedAsset?.id]);

  function toggleAsset(assetId) {
    setSelectedIds((current) => current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]);
  }

  function selectCreatedAsset(asset, successKey) {
    if (asset) {
      setSelectedAsset(asset);
      setMessage(t(assetLabels, successKey));
    }
    loadAssets();
  }

  async function saveAsset(asset, draft) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/assets/${asset.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t(assetLabels, "saveFailed"));
      setSelectedAsset(result.asset);
      setData((current) => ({
        ...current,
        assets: (current.assets || []).map((item) => item.id === result.asset.id ? result.asset : item),
        folders: Array.from(new Set([...(current.folders || []), result.asset.directoryPath].filter(Boolean))).sort()
      }));
      setMessage(t(assetLabels, "metadataSaved"));
    } catch (saveError) {
      setError(saveError.message || t(assetLabels, "saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function applyBulk(action) {
    if (!selectedIds.length) return;
    if (action === "archive" && !window.confirm(formatTemplate(t(assetLabels, "deleteConfirm"), { count: selectedIds.length }))) {
      return;
    }
    setBulkSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/assets/bulk/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          assetIds: selectedIds,
          directoryPath: bulkFolder,
          tags: splitTags(bulkTags),
          tagMode: "append"
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t(assetLabels, "bulkFailed"));
      setSelectedIds([]);
      setBulkFolder("");
      setBulkTags("");
      setMessage(t(assetLabels, "bulkUpdated"));
      await loadAssets();
    } catch (bulkError) {
      setError(bulkError.message || t(assetLabels, "bulkFailed"));
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <>
      <section className="admin-asset-library">
        <div className="admin-asset-kpis">
          <article>
            <span>{page.metrics.totalAssets}</span>
            <strong>{Number(data.total || 0)}</strong>
          </article>
          <article>
            <span>{page.metrics.generatedVisible}</span>
            <strong>{generatedVisible}</strong>
          </article>
          <article>
            <span>{page.metrics.folders}</span>
            <strong>{folders.length}</strong>
          </article>
          <article>
            <span>{page.metrics.tags}</span>
            <strong>{tags.length}</strong>
          </article>
        </div>

        <div className="admin-asset-actions">
          <button className="button primary" type="button" onClick={() => setUploadOpen(true)}>
            <UploadCloud size={16} aria-hidden="true" />
            {page.actions.upload}
          </button>
          <button className="button secondary" type="button" onClick={() => setGenerateOpen(true)}>
            <Sparkles size={16} aria-hidden="true" />
            {page.actions.generate}
          </button>
          <button className="icon-button" type="button" onClick={loadAssets} title={t(assetLabels, "refresh")} aria-label={t(assetLabels, "refresh")}>
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>

        <form className="admin-asset-filter" onSubmit={(event) => event.preventDefault()}>
          <label>
            <Search size={15} aria-hidden="true" />
            <input autoComplete="off" name="assetSearch" value={query} placeholder={t(assetLabels, "searchPlaceholder")} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select name="assetDirectoryFilter" value={directory} onChange={(event) => setDirectory(event.target.value)} aria-label={t(assetLabels, "directoryPath")}>
            <option value="">{t(assetLabels, "allDirectories")}</option>
            {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
          </select>
          <select name="assetSourceFilter" value={source} onChange={(event) => setSource(event.target.value)} aria-label={t(assetLabels, "source")}>
            <option value="">{t(assetLabels, "allSources")}</option>
            {SOURCE_OPTIONS.map((item) => <option value={item} key={item}>{assetLabels.sourceLabels?.[item] || item}</option>)}
          </select>
          <select name="assetTagFilter" value={tag} onChange={(event) => setTag(event.target.value)} aria-label={t(assetLabels, "tags")}>
            <option value="">{t(assetLabels, "allTags")}</option>
            {tags.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </form>

        {(message || error) ? (
          <div className="admin-asset-feedback" role="status" aria-live="polite">
            {message ? <p className="form-message success">{message}</p> : null}
            {error ? <p className="form-message error">{error}</p> : null}
          </div>
        ) : null}

        <div className="admin-asset-workspace">
          <main className="admin-asset-main">
            {selectedIds.length ? (
              <div className="admin-asset-bulk">
                <strong>{formatTemplate(t(assetLabels, "selectedCount"), { count: selectedIds.length })}</strong>
                <select name="bulkFolder" value={bulkFolder} onChange={(event) => setBulkFolder(event.target.value)} aria-label={t(assetLabels, "targetFolder")}>
                  <option value="">{t(assetLabels, "uncategorized")}</option>
                  {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
                </select>
                <button type="button" onClick={() => applyBulk("move")} disabled={bulkSaving}>
                  <FolderOpen size={14} aria-hidden="true" />
                  {t(assetLabels, "bulkMove")}
                </button>
                <input autoComplete="off" name="bulkTags" value={bulkTags} placeholder={t(assetLabels, "tagNamePlaceholder")} onChange={(event) => setBulkTags(event.target.value)} />
                <button type="button" onClick={() => applyBulk("tags")} disabled={bulkSaving || !bulkTags.trim()}>
                  <Tag size={14} aria-hidden="true" />
                  {t(assetLabels, "bulkTags")}
                </button>
                <button className="danger" type="button" onClick={() => applyBulk("archive")} disabled={bulkSaving}>
                  <Archive size={14} aria-hidden="true" />
                  {t(assetLabels, "bulkDelete")}
                </button>
                <button type="button" onClick={() => setSelectedIds([])} aria-label={t(assetLabels, "clearSelection")}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
              {(data.assets || []).length ? (
                <div className="admin-asset-grid">
                  {(data.assets || []).map((asset) => (
                    <AssetLibraryCard
                      asset={asset}
                      checked={checkedIds.has(asset.id)}
                      key={asset.id}
                      labels={assetLabels}
                      locale={locale}
                      selected={selectedAsset?.id === asset.id}
                      onSelect={setSelectedAsset}
                      onToggle={toggleAsset}
                    />
                  ))}
                </div>
              ) : (
                <article className="admin-panel admin-empty-state">
                  <h2>{page.emptyTitle}</h2>
                  <p>{page.emptyLead}</p>
                </article>
              )}
            </AdminAsyncState>

            <nav className="admin-asset-pagination" aria-label={t(assetLabels, "paginationLabel")}>
              <span>{formatTemplate(t(assetLabels, "paginationSummary"), { total: Number(data.total || 0) })}</span>
              <div>
                <button className="button secondary compact" type="button" disabled={currentPage <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
                  {t(assetLabels, "previousPage")}
                </button>
                {visiblePages.map((item) => typeof item === "number" ? (
                  <button className={`button secondary compact ${item === currentPage ? "active" : ""}`} type="button" key={item} onClick={() => setPageNumber(item)} aria-current={item === currentPage ? "page" : undefined}>
                    {item}
                  </button>
                ) : (
                  <span key={item}>…</span>
                ))}
                <button className="button secondary compact" type="button" disabled={currentPage >= totalPages} onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}>
                  {t(assetLabels, "nextPage")}
                </button>
              </div>
              <label>
                <span>{t(assetLabels, "itemsPerPage")}</span>
                <select name="assetPageSize" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {ASSET_PAGE_SIZE_OPTIONS.map((option) => <option value={option} key={option}>{option}</option>)}
                </select>
              </label>
              <small>{formatTemplate(t(assetLabels, "paginationPageStatus"), { page: currentPage, totalPages })}</small>
            </nav>
          </main>

          <aside className="admin-asset-side-rail">
            <AssetFolderPanel labels={assetLabels} folderItems={data.folderItems || []} total={Number(data.total || 0)} directory={directory} onChange={setDirectory} />
            <AssetDetail asset={selectedAsset} labels={assetLabels} locale={locale} folders={folders} saving={saving} usageState={usageState} onSave={saveAsset} />
          </aside>
        </div>
      </section>

      <AdminAssetUploadModal
        open={uploadOpen}
        labels={assetLabels}
        folders={folders}
        onClose={() => {
          setUploadOpen(false);
          loadAssets();
        }}
        onUploaded={(asset) => selectCreatedAsset(asset, "assetUploaded")}
      />

      <AdminAssetGenerateModal
        open={generateOpen}
        labels={assetLabels}
        locale={locale}
        folders={folders}
        imageSettings={imageSettings}
        defaultGenerateSize={defaultGenerateSize}
        onClose={() => {
          setGenerateOpen(false);
          loadAssets();
        }}
        onGenerated={(asset) => selectCreatedAsset(asset, "generatedSaved")}
      />
    </>
  );
}
