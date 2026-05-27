"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";
import {
  AlertCircle,
  Check,
  CheckSquare,
  Download,
  FileImage,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  MoveRight,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import assetRules from "@/lib/project-assets-core.cjs";

const TABS = ["project", "generate"];
const IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
const IMAGE_QUALITIES = ["auto", "low", "medium", "high"];
const ASSET_PAGE_LIMITS = [24, 48, 60];
const DEFAULT_ASSET_PAGE_LIMIT = 24;
const ACTIVE_UPLOAD_STATUSES = new Set(["preparing", "uploading", "finalizing"]);
const { validateAssetFileInput } = assetRules;

function t(labels, key) {
  return labels?.[key] || key;
}

function formatTemplate(template = "", values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
}

function validationMessage(labels, code) {
  return labels?.validation?.[code] || labels?.uploadFailed || code;
}

function uploadStatusLabel(labels, status) {
  return labels?.uploadStatuses?.[status] || status;
}

function formatBytes(bytes, labels) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} ${labels?.units?.mb || "MB"}`;
  if (size >= 1024) return `${Math.ceil(size / 1024)} ${labels?.units?.kb || "KB"}`;
  return `${size} ${labels?.units?.bytes || "B"}`;
}

function formatDate(value, locale) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getRelativePath(file) {
  return file.webkitRelativePath || file.name;
}

function escapeMarkdownAlt(value = "") {
  return String(value || "").replace(/\]/g, "\\]");
}

function taskIdFor(file, index) {
  return `${getRelativePath(file)}-${file.size}-${file.lastModified || 0}-${index}-${Date.now()}`;
}

async function readImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith("image/")) {
      resolve({ width: 0, height: 0 });
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    image.src = url;
  });
}

function AssetCard({ asset, labels, locale, selected, checked, onSelect, onToggle }) {
  return (
    <article className={`asset-card ${selected ? "selected" : ""} ${checked ? "checked" : ""}`}>
      <label className="asset-card-checkbox" title={t(labels, "selectForBatch")}>
        <input checked={checked} type="checkbox" onChange={() => onToggle(asset.id)} />
        <span aria-hidden="true">{checked ? <CheckSquare size={15} /> : null}</span>
      </label>
      <button className="asset-card-main" type="button" onClick={() => onSelect(asset)}>
        <span className="asset-card-thumb">
          {asset.url ? <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} loading="lazy" /> : <ImageIcon size={30} aria-hidden="true" />}
        </span>
        <span className="asset-card-body">
          <strong title={asset.displayName}>{asset.displayName || asset.originalFilename}</strong>
          <small>{[asset.directoryPath, formatBytes(asset.fileSize, labels)].filter(Boolean).join(" / ")}</small>
          <small>{[labels.sourceLabels?.[asset.source] || asset.source, formatDate(asset.updatedAt, locale)].filter(Boolean).join(" · ")}</small>
        </span>
      </button>
      {selected ? <span className="asset-card-check"><Check size={14} aria-hidden="true" /></span> : null}
    </article>
  );
}

function FolderCard({ folder, labels, locale, onOpen }) {
  return (
    <article className="asset-card asset-folder-card">
      <span className="asset-folder-badge">{t(labels, "folderBadge")}</span>
      <button className="asset-card-main" type="button" onClick={() => onOpen(folder.directoryPath)}>
        <span className="asset-card-thumb asset-folder-thumb">
          <Folder size={58} aria-hidden="true" />
        </span>
        <span className="asset-card-body">
          <strong title={folder.directoryPath}>{folder.displayName || folder.directoryPath}</strong>
          <small>{formatTemplate(t(labels, "folderAssetCount"), { count: folder.assetCount })}</small>
          <small>{[folder.totalBytes ? formatBytes(folder.totalBytes, labels) : t(labels, "folderEmpty"), formatDate(folder.updatedAt, locale)].filter(Boolean).join(" / ")}</small>
        </span>
      </button>
    </article>
  );
}

function AssetPagination({ labels, page, limit, total, onPageChange, onLimitChange }) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / limit));
  const currentPage = Math.min(page, totalPages);
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pages = Array.from({ length: endPage - startPage + 1 }, (_item, index) => startPage + index);

  if (!total) return null;

  return (
    <div className="asset-pagination" aria-label={t(labels, "paginationLabel")}>
      <span>{formatTemplate(t(labels, "paginationSummary"), { total })}</span>
      <div className="asset-pagination-actions">
        <button className="button secondary compact" type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
          {t(labels, "previousPage")}
        </button>
        <div className="asset-pagination-pages">
          {pages.map((item) => (
            <button className={item === currentPage ? "active" : ""} key={item} type="button" onClick={() => onPageChange(item)} aria-current={item === currentPage ? "page" : undefined}>
              {item}
            </button>
          ))}
        </div>
        <button className="button secondary compact" type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
          {t(labels, "nextPage")}
        </button>
      </div>
      <label className="asset-page-size">
        <span>{t(labels, "itemsPerPage")}</span>
        <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
          {ASSET_PAGE_LIMITS.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}

function FolderBreadcrumb({ labels, directory, onSelect }) {
  const parts = String(directory || "").split("/").filter(Boolean);

  if (!parts.length) return null;

  const crumbs = [
    { label: t(labels, "allDirectories"), value: "" },
    ...parts.map((part, index) => ({
      label: part,
      value: parts.slice(0, index + 1).join("/")
    }))
  ];

  return (
    <nav className="asset-folder-breadcrumb" aria-label={t(labels, "folderBreadcrumb")}>
      <span>{t(labels, "folderBreadcrumb")}</span>
      <ol>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.value}-${index}`}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              <button type="button" disabled={last} onClick={() => onSelect(crumb.value)}>
                {crumb.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AssetGrid({ assets, folderItems, labels, locale, selectedAsset, selectedIds, loading, onOpenFolder, onSelect, onToggle }) {
  if (loading) {
    return (
      <div className="asset-empty-state">
        <Loader2 className="spin" size={24} aria-hidden="true" />
        <p>{t(labels, "loading")}</p>
      </div>
    );
  }

  if (!assets.length && !folderItems.length) {
    return (
      <div className="asset-empty-state">
        <FileImage size={28} aria-hidden="true" />
        <p>{t(labels, "noAssets")}</p>
      </div>
    );
  }

  return (
    <div className="asset-grid">
      {folderItems.map((folder) => (
        <FolderCard
          folder={folder}
          key={folder.directoryPath}
          labels={labels}
          locale={locale}
          onOpen={onOpenFolder}
        />
      ))}
      {assets.map((asset) => (
        <AssetCard
          asset={asset}
          checked={selectedIds.has(asset.id)}
          key={asset.id}
          labels={labels}
          locale={locale}
          selected={selectedAsset?.id === asset.id}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function AssetSearch({ labels, query, tags, selectedTag, onQueryChange, onTagSelect, onClearTag }) {
  const [focused, setFocused] = useState(false);
  const quickTags = tags.slice(0, 12);

  return (
    <div className="asset-search-wrap">
      <div className="asset-search">
        <Search size={15} aria-hidden="true" />
        {selectedTag ? (
          <button className="asset-active-filter" type="button" onClick={onClearTag}>
            <Tag size={13} aria-hidden="true" />
            <span>{selectedTag}</span>
            <X size={12} aria-hidden="true" />
          </button>
        ) : null}
        <input
          value={query}
          placeholder={t(labels, "searchPlaceholder")}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => setFocused(true)}
        />
      </div>
      {focused && quickTags.length ? (
        <div className="asset-search-popover">
          <span>{t(labels, "quickTags")}</span>
          <div className="asset-chip-row">
            {quickTags.map((tag) => (
              <button className={selectedTag === tag ? "selected" : ""} key={tag} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onTagSelect(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TagPicker({ labels, availableTags, selectedTags, onChange, onCreateTag, onDeleteTag }) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingTag, setDeletingTag] = useState("");
  const [error, setError] = useState("");
  const [popoverStyle, setPopoverStyle] = useState({});
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const normalizedSelectedTags = selectedTags || [];
  const commonTags = useMemo(() => {
    const selectedSet = new Set(normalizedSelectedTags);
    return Array.from(new Set([...normalizedSelectedTags, ...availableTags.filter((tag) => !selectedSet.has(tag)).slice(0, 6)])).filter(Boolean);
  }, [availableTags, normalizedSelectedTags]);

  useEffect(() => {
    if (!open) return undefined;

    function placePopover() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelRect = buttonRef.current?.closest(".asset-picker-panel")?.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 220), 300, window.innerWidth - 48);
      const left = Math.min(Math.max(24, rect.left), window.innerWidth - width - 24);
      const maxTop = panelRect ? panelRect.top + 12 : 24;
      const maxBottom = panelRect ? panelRect.bottom - 62 : window.innerHeight - 24;
      const availableBelow = maxBottom - rect.bottom - 8;
      const availableAbove = rect.top - maxTop - 8;
      const height = Math.max(130, Math.min(210, Math.max(availableBelow, availableAbove), window.innerHeight - 48));
      const openBelow = availableBelow >= 130 || availableBelow >= availableAbove;
      const top = openBelow ? rect.bottom + 8 : Math.max(maxTop, rect.top - height - 8);
      setPopoverStyle({ left, top, width, maxHeight: height });
    }

    placePopover();
    window.addEventListener("resize", placePopover);
    window.addEventListener("scroll", placePopover, true);
    return () => {
      window.removeEventListener("resize", placePopover);
      window.removeEventListener("scroll", placePopover, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsidePointer(event) {
      const target = event.target;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [open]);

  function toggleTag(tag) {
    if (normalizedSelectedTags.includes(tag)) {
      onChange(normalizedSelectedTags.filter((item) => item !== tag));
      return;
    }
    onChange([...normalizedSelectedTags, tag].slice(0, 12));
  }

  function removeTag(tag) {
    onChange(normalizedSelectedTags.filter((item) => item !== tag));
  }

  async function submitTag() {
    const value = newTag.trim();
    if (!value) return;
    setCreating(true);
    setError("");
    try {
      const created = await onCreateTag(value);
      const tagName = created?.name || value;
      if (!normalizedSelectedTags.includes(tagName)) {
        onChange([...normalizedSelectedTags, tagName].slice(0, 12));
      }
      setNewTag("");
    } catch (createError) {
      setError(createError.message || t(labels, "tagFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function deleteTag(tag) {
    if (!onDeleteTag || deletingTag) return;
    const confirmed = window.confirm(formatTemplate(t(labels, "deleteTagConfirm"), { tag }));
    if (!confirmed) return;
    setDeletingTag(tag);
    setError("");
    try {
      await onDeleteTag(tag);
      onChange(normalizedSelectedTags.filter((item) => item.toLowerCase() !== tag.toLowerCase()));
    } catch (deleteError) {
      setError(deleteError.message || t(labels, "tagDeleteFailed"));
    } finally {
      setDeletingTag("");
    }
  }

  function renderTagGroup(title, groupTags) {
    return (
      <section className="asset-tag-group">
        <span>{title}</span>
        {groupTags.length ? (
          <div className="asset-chip-row asset-tag-options">
            {groupTags.map((tag) => {
              const selected = normalizedSelectedTags.includes(tag);
              const deleting = deletingTag.toLowerCase() === tag.toLowerCase();
              return (
                <span className={`asset-tag-option ${selected ? "selected" : ""}`} key={tag}>
                  <button className="asset-tag-select" type="button" onClick={() => toggleTag(tag)}>
                    {tag}
                    {selected ? <Check size={12} aria-hidden="true" /> : null}
                  </button>
                  {onDeleteTag ? (
                    <button
                      className="asset-tag-delete"
                      type="button"
                      onClick={() => deleteTag(tag)}
                      disabled={Boolean(deletingTag)}
                      title={t(labels, "deleteTag")}
                      aria-label={`${t(labels, "deleteTag")} ${tag}`}
                    >
                      {deleting ? <Loader2 size={12} aria-hidden="true" className="spin" /> : <Trash2 size={12} aria-hidden="true" />}
                    </button>
                  ) : null}
                </span>
              );
            })}
          </div>
        ) : <span className="asset-muted-label">{t(labels, "noSavedTags")}</span>}
      </section>
    );
  }

  const popover = open ? (
    <div ref={popoverRef} className="asset-tag-popover floating" style={popoverStyle} onPointerDown={(event) => event.stopPropagation()}>
      <button className="asset-tag-popover-close" type="button" onClick={() => setOpen(false)} title={t(labels, "close")} aria-label={t(labels, "close")}>
        <X size={14} aria-hidden="true" />
      </button>
      {renderTagGroup(t(labels, "commonTags"), commonTags)}
      {renderTagGroup(t(labels, "allTags"), availableTags)}
      <div className="asset-tag-create">
        <input value={newTag} placeholder={t(labels, "tagNamePlaceholder")} onChange={(event) => setNewTag(event.target.value)} />
        <button className="button secondary compact" type="button" onClick={submitTag} disabled={creating || !newTag.trim()}>
          <Plus size={13} aria-hidden="true" />
          {creating ? t(labels, "saving") : t(labels, "createTag")}
        </button>
      </div>
      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  ) : null;

  return (
    <div className="asset-tag-picker">
      <div
        ref={buttonRef}
        className={`asset-tag-control ${open ? "open" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
      >
        {normalizedSelectedTags.length ? (
          normalizedSelectedTags.map((tag) => (
            <span className="asset-chip removable" key={tag}>
              {tag}
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                removeTag(tag);
              }} aria-label={`${t(labels, "removeTag")} ${tag}`}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))
        ) : (
          <span className="asset-tag-placeholder">{t(labels, "noTags")}</span>
        )}
      </div>
      {typeof document !== "undefined" && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}

function AssetInspector({ asset, labels, locale, saving, folders, tags, onCreateTag, onDeleteTag, onPreview, onSave }) {
  const [draft, setDraft] = useState(() => ({
    displayName: asset?.displayName || "",
    altText: asset?.altText || "",
    directoryPath: asset?.directoryPath || "",
    tags: asset?.tags || []
  }));

  useEffect(() => {
    setDraft({
      displayName: asset?.displayName || "",
      altText: asset?.altText || "",
      directoryPath: asset?.directoryPath || "",
      tags: asset?.tags || []
    });
  }, [asset]);

  if (!asset) {
    return (
      <aside className="asset-inspector empty">
        <div className="asset-empty-state">
          <ImageIcon size={28} aria-hidden="true" />
          <p>{t(labels, "selectAssetHint")}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="asset-inspector">
      <div className="asset-inspector-summary">
        <button className="asset-inspector-thumb" type="button" onClick={() => onPreview?.(asset)} title={t(labels, "previewOriginal")} aria-label={t(labels, "previewOriginal")}>
          <span className="asset-inspector-thumb-stage">
            <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} loading="lazy" />
          </span>
        </button>
        <div className="asset-inspector-meta">
          <span>{labels.sourceLabels?.[asset.source] || asset.source}</span>
          <span>{formatBytes(asset.fileSize, labels)}</span>
          {asset.width && asset.height ? <span>{asset.width} x {asset.height}</span> : null}
          <span>{formatDate(asset.updatedAt, locale)}</span>
        </div>
      </div>
      <label className="asset-field">
        <span>{t(labels, "displayName")}</span>
        <input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "altText")}</span>
        <input value={draft.altText} onChange={(event) => setDraft((current) => ({ ...current, altText: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "directoryPath")}</span>
        <select value={draft.directoryPath} onChange={(event) => setDraft((current) => ({ ...current, directoryPath: event.target.value }))}>
          <option value="">{t(labels, "uncategorized")}</option>
          {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
        </select>
      </label>
      <label className="asset-field">
        <span>{t(labels, "tags")}</span>
        <TagPicker
          labels={labels}
          availableTags={tags}
          selectedTags={draft.tags}
          onChange={(nextTags) => setDraft((current) => ({ ...current, tags: nextTags }))}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
        />
      </label>
      <button className="button secondary compact" type="button" onClick={() => onSave(asset, draft)} disabled={saving || !draft.displayName.trim()}>
        <Pencil size={14} aria-hidden="true" />
        {saving ? t(labels, "saving") : t(labels, "saveMetadata")}
      </button>
    </aside>
  );
}

function AssetOriginalPreview({ asset, labels, onClose }) {
  const frameRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setNaturalSize({ width: 0, height: 0 });
  }, [asset?.id, asset?.url]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;

    function updateFrameSize() {
      const rect = node.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    }

    updateFrameSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFrameSize);
      return () => window.removeEventListener("resize", updateFrameSize);
    }

    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [asset]);

  if (!asset) return null;

  const safeRotation = ((rotation % 360) + 360) % 360;
  const sideways = safeRotation === 90 || safeRotation === 270;
  const usableFrame = {
    width: Math.max(0, frameSize.width - 36),
    height: Math.max(0, frameSize.height - 36)
  };
  const canMeasure = usableFrame.width > 0 && usableFrame.height > 0 && naturalSize.width > 0 && naturalSize.height > 0;
  const visualWidth = sideways ? naturalSize.height : naturalSize.width;
  const visualHeight = sideways ? naturalSize.width : naturalSize.height;
  const containScale = canMeasure ? Math.min(usableFrame.width / visualWidth, usableFrame.height / visualHeight) : 1;
  const imageStyle = canMeasure
    ? {
      width: `${naturalSize.width * containScale * zoom}px`,
      height: `${naturalSize.height * containScale * zoom}px`,
      transform: `rotate(${safeRotation}deg)`
    }
    : {
      width: "auto",
      height: "auto",
      maxWidth: "100%",
      maxHeight: "100%",
      transform: `rotate(${safeRotation}deg) scale(${zoom})`
    };
  const zoomLabel = formatTemplate(t(labels, "previewScale"), { scale: Math.round(zoom * 100) });
  const previewAlt = asset.altText || asset.displayName || asset.originalFilename;

  return (
    <div className="asset-original-preview" role="dialog" aria-modal="true" aria-label={t(labels, "originalPreview")} onPointerDown={onClose}>
      <div className="asset-original-preview-panel" onPointerDown={(event) => event.stopPropagation()}>
        <header>
          <strong title={asset.displayName || asset.originalFilename}>{asset.displayName || asset.originalFilename}</strong>
          <button className="icon-button" type="button" onClick={onClose} title={t(labels, "close")} aria-label={t(labels, "close")}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="asset-original-preview-toolbar" aria-label={t(labels, "originalPreview")}>
          <button type="button" onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))} disabled={zoom <= 0.5} title={t(labels, "zoomOut")} aria-label={t(labels, "zoomOut")}>
            <ZoomOut size={16} aria-hidden="true" />
          </button>
          <span className="asset-original-preview-scale">{zoomLabel}</span>
          <button type="button" onClick={() => setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))} disabled={zoom >= 3} title={t(labels, "zoomIn")} aria-label={t(labels, "zoomIn")}>
            <ZoomIn size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setRotation((current) => (current + 90) % 360)} title={t(labels, "rotateImage")} aria-label={t(labels, "rotateImage")}>
            <RotateCw size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => { setZoom(1); setRotation(0); }} title={t(labels, "resetPreview")} aria-label={t(labels, "resetPreview")}>
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="asset-original-preview-frame" ref={frameRef}>
          <img
            src={asset.url}
            alt={previewAlt}
            onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth || 0, height: event.currentTarget.naturalHeight || 0 })}
            style={imageStyle}
          />
        </div>
      </div>
    </div>
  );
}

function UploadTaskRow({ labels, task, onCancel, onResume }) {
  const isActive = ACTIVE_UPLOAD_STATUSES.has(task.status);
  const canResume = task.status === "paused" || task.status === "cancelled" || task.status === "failed";
  return (
    <div className={`asset-upload-task ${task.status}`}>
      <span className="asset-upload-task-icon">
        {task.status === "completed" ? <Check size={15} /> : task.status === "failed" || task.status === "rejected" ? <AlertCircle size={15} /> : <UploadCloud size={15} />}
      </span>
      <div className="asset-upload-task-main">
        <div className="asset-upload-task-head">
          <strong title={task.relativePath}>{task.relativePath}</strong>
          <small>{task.status === "rejected" ? validationMessage(labels, task.code) : uploadStatusLabel(labels, task.status)}</small>
        </div>
        <div className={`asset-upload-meter ${isActive ? "active" : ""}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(task.progress || 0)}>
          <span style={{ width: `${Math.max(0, Math.min(100, task.progress || 0))}%` }} />
        </div>
        <p>{task.error ? task.error : `${formatBytes(task.uploadedBytes || 0, labels)} / ${formatBytes(task.file?.size || task.fileSize || 0, labels)}`}</p>
      </div>
      <div className="asset-upload-task-actions">
        {canResume ? (
          <button className="button secondary compact" type="button" onClick={() => onResume(task.id)}>
            <Play size={13} aria-hidden="true" />
            {t(labels, "resumeUpload")}
          </button>
        ) : null}
        {isActive ? (
          <button className="button secondary compact" type="button" onClick={() => onCancel(task.id)}>
            <PauseCircle size={13} aria-hidden="true" />
            {t(labels, "cancelUpload")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function UploadPanel({ labels, uploadBusy, uploadTasks, dragActive, onBrowse, onBrowseFolder, onDropFiles, onDragState, onCancelTask, onResumeTask }) {
  return (
    <aside className="asset-upload-panel">
      <div className="asset-upload-panel-head">
        <div>
          <strong>{t(labels, "uploadQueue")}</strong>
          <span>{formatTemplate(t(labels, "uploadQueueCount"), { count: uploadTasks.length })}</span>
        </div>
      </div>
      <div
        className={`asset-dropzone ${dragActive ? "active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          onDragState(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          onDragState(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          onDragState(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDragState(false);
          onDropFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={26} aria-hidden="true" />
        <strong>{uploadBusy ? t(labels, "uploading") : t(labels, "dropTitle")}</strong>
        <p>{t(labels, "formatHint")}</p>
        <div className="asset-dropzone-actions">
          <button className="button primary compact" type="button" onClick={onBrowse}>
            <FileImage size={14} aria-hidden="true" />
            {t(labels, "browseImages")}
          </button>
          <button className="button secondary compact" type="button" onClick={onBrowseFolder}>
            <FolderOpen size={14} aria-hidden="true" />
            {t(labels, "browseFolder")}
          </button>
        </div>
      </div>
      <div className="asset-upload-queue">
        {uploadTasks.length ? (
          <div className="asset-upload-task-list">
            {uploadTasks.map((task) => (
              <UploadTaskRow labels={labels} key={task.id} task={task} onCancel={onCancelTask} onResume={onResumeTask} />
            ))}
          </div>
        ) : (
          <div className="asset-upload-empty">
            <FileImage size={22} aria-hidden="true" />
            <p>{t(labels, "uploadQueueEmpty")}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function BulkActionPanel({ labels, mode, folders, tags, draft, busy, onDraftChange, onCreateTag, onDeleteTag, onApply, onCancel }) {
  if (!mode) return null;
  return (
    <div className="asset-bulk-panel">
      {mode === "move" ? (
        <label className="asset-field">
          <span>{t(labels, "targetFolder")}</span>
          <select value={draft.directoryPath} onChange={(event) => onDraftChange({ directoryPath: event.target.value })}>
            <option value="">{t(labels, "uncategorized")}</option>
            {folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
          </select>
        </label>
      ) : null}
      {mode === "tags" ? (
        <>
          <div className="asset-segmented">
            <button className={draft.tagMode === "append" ? "active" : ""} type="button" onClick={() => onDraftChange({ tagMode: "append" })}>{t(labels, "appendTags")}</button>
            <button className={draft.tagMode === "replace" ? "active" : ""} type="button" onClick={() => onDraftChange({ tagMode: "replace" })}>{t(labels, "replaceTags")}</button>
          </div>
          <label className="asset-field">
            <span>{t(labels, "tags")}</span>
            <TagPicker labels={labels} availableTags={tags} selectedTags={draft.tags} onChange={(nextTags) => onDraftChange({ tags: nextTags })} onCreateTag={onCreateTag} onDeleteTag={onDeleteTag} />
          </label>
        </>
      ) : null}
      {mode === "altText" ? (
        <label className="asset-field">
          <span>{t(labels, "altText")}</span>
          <input value={draft.altText} placeholder={t(labels, "bulkAltPlaceholder")} onChange={(event) => onDraftChange({ altText: event.target.value })} />
        </label>
      ) : null}
      <div className="asset-bulk-panel-actions">
        <button className="button secondary compact" type="button" onClick={onCancel}>{t(labels, "cancel")}</button>
        <button className="button primary compact" type="button" onClick={onApply} disabled={busy || (mode === "tags" && !draft.tags.length)}>
          {busy ? t(labels, "saving") : t(labels, "applyBulk")}
        </button>
      </div>
    </div>
  );
}

function BulkActionBar({ labels, count, activeMode, onMode, onDelete, onClear }) {
  if (!count) return null;
  return (
    <div className="asset-bulk-bar">
      <strong>{formatTemplate(t(labels, "selectedCount"), { count })}</strong>
      <div>
        <button className={activeMode === "move" ? "active" : ""} type="button" onClick={() => onMode("move")}>
          <MoveRight size={14} aria-hidden="true" />
          {t(labels, "bulkMove")}
        </button>
        <button className={activeMode === "tags" ? "active" : ""} type="button" onClick={() => onMode("tags")}>
          <Tag size={14} aria-hidden="true" />
          {t(labels, "bulkTags")}
        </button>
        <button className={activeMode === "altText" ? "active" : ""} type="button" onClick={() => onMode("altText")}>
          <Pencil size={14} aria-hidden="true" />
          {t(labels, "bulkAltText")}
        </button>
        <button className="danger" type="button" onClick={onDelete}>
          <Trash2 size={14} aria-hidden="true" />
          {t(labels, "bulkDelete")}
        </button>
        <button type="button" onClick={onClear}>{t(labels, "clearSelection")}</button>
      </div>
    </div>
  );
}

function normalizePanelSize(size) {
  return IMAGE_SIZES.includes(size) ? size : "1024x1024";
}

function normalizePromptMode(mode, hasContext) {
  return hasContext && mode === "section_context" ? "section_context" : "manual";
}

function GeneratePanel({
  labels,
  generating,
  generatedAsset,
  error,
  defaultSize = "1024x1024",
  promptContext,
  defaultPromptMode = "manual",
  onDownloadGenerated,
  onGenerate,
  onSaveGenerated,
  onSelectGenerated
}) {
  const hasPromptContext = Boolean(promptContext?.hasContext && promptContext?.prompt);
  const normalizedDefaultMode = normalizePromptMode(defaultPromptMode, hasPromptContext);
  const [promptMode, setPromptMode] = useState(normalizedDefaultMode);
  const [prompt, setPrompt] = useState("");
  const normalizedDefaultSize = normalizePanelSize(defaultSize);
  const [size, setSize] = useState(normalizedDefaultSize);
  const [quality, setQuality] = useState("auto");
  const finalPrompt = promptMode === "section_context"
    ? [promptContext?.prompt, prompt.trim() ? `Additional style requirements: ${prompt.trim()}` : ""].filter(Boolean).join("\n\n")
    : prompt.trim();

  useEffect(() => {
    setSize(normalizedDefaultSize);
  }, [normalizedDefaultSize]);

  useEffect(() => {
    setPromptMode(normalizedDefaultMode);
    setPrompt("");
  }, [normalizedDefaultMode, promptContext?.metadata?.sectionId, promptContext?.metadata?.pathKey]);

  return (
    <div className="asset-generate-panel">
      <section className="asset-generate-form">
        {hasPromptContext ? (
          <div className="asset-prompt-source">
            <span>{t(labels, "promptSource")}</span>
            <div>
              <button className={promptMode === "section_context" ? "active" : ""} type="button" onClick={() => setPromptMode("section_context")}>
                {t(labels, "promptModeContext")}
              </button>
              <button className={promptMode === "manual" ? "active" : ""} type="button" onClick={() => setPromptMode("manual")}>
                {t(labels, "promptModeManual")}
              </button>
            </div>
          </div>
        ) : null}
        {hasPromptContext && promptMode === "section_context" ? (
          <article className="asset-context-card">
            <strong>{t(labels, "contextSummary")}</strong>
            <p>{promptContext.summary || t(labels, "contextSummaryEmpty")}</p>
          </article>
        ) : null}
        <label className="asset-field">
          <span>{promptMode === "section_context" ? t(labels, "promptSupplement") : t(labels, "prompt")}</span>
          <textarea
            value={prompt}
            placeholder={promptMode === "section_context" ? t(labels, "promptSupplementPlaceholder") : t(labels, "promptPlaceholder")}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <div className="asset-generate-options">
          <label className="asset-field">
            <span>{t(labels, "size")}</span>
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              {IMAGE_SIZES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="asset-field">
            <span>{t(labels, "quality")}</span>
            <select value={quality} onChange={(event) => setQuality(event.target.value)}>
              {IMAGE_QUALITIES.map((option) => <option key={option} value={option}>{labels.qualityLabels?.[option] || option}</option>)}
            </select>
          </label>
        </div>
        <p className="muted-line">{formatTemplate(t(labels, "suggestedSize"), { size: normalizedDefaultSize })}</p>
        <button
          className="button primary"
          type="button"
          onClick={() => onGenerate({
            prompt: finalPrompt,
            size,
            quality,
            promptMode,
            promptSupplement: prompt,
            promptContext: promptMode === "section_context" ? promptContext?.metadata : null
          })}
          disabled={generating || !finalPrompt.trim()}
        >
          <Sparkles size={16} aria-hidden="true" />
          {generating ? t(labels, "generating") : t(labels, "generateImage")}
        </button>
        {error ? <p className="form-message error">{error}</p> : null}
      </section>
      <section className="asset-generated-preview">
        {generating ? (
          <div className="asset-empty-state">
            <Loader2 className="spin" size={26} aria-hidden="true" />
            <p>{t(labels, "generating")}</p>
          </div>
        ) : generatedAsset ? (
          <>
            <img src={generatedAsset.url} alt={generatedAsset.altText || generatedAsset.displayName} />
            <div className="asset-generated-actions">
              <button className="button secondary compact" type="button" onClick={() => onSaveGenerated(generatedAsset)}>
                <FolderOpen size={14} aria-hidden="true" />
                {t(labels, "saveGeneratedToProject")}
              </button>
              <button className="button secondary compact" type="button" onClick={() => onDownloadGenerated(generatedAsset)}>
                <Download size={14} aria-hidden="true" />
                {t(labels, "downloadImage")}
              </button>
              <button className="button primary compact" type="button" onClick={() => onSelectGenerated(generatedAsset)}>
                <Check size={14} aria-hidden="true" />
                {t(labels, "useGenerated")}
              </button>
            </div>
          </>
        ) : (
          <div className="asset-empty-state dashed">
            <ImageIcon size={30} aria-hidden="true" />
            <p>{t(labels, "noGeneratedImage")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function AssetPickerModal({
  open,
  labels = {},
  locale = "en",
  onClose,
  onSelect,
  initialTab = "project",
  libraryHref = "",
  defaultGenerateSize = "1024x1024",
  promptContext = null,
  defaultPromptMode = "manual"
}) {
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : "project");
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState("");
  const [source, setSource] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [folderCreatorOpen, setFolderCreatorOpen] = useState(false);
  const [toolbarFolderName, setToolbarFolderName] = useState("");
  const [creatingToolbarFolder, setCreatingToolbarFolder] = useState(false);
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderItems, setFolderItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_ASSET_PAGE_LIMIT);
  const [totalAssets, setTotalAssets] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [bulkMode, setBulkMode] = useState("");
  const [bulkDraft, setBulkDraft] = useState({ directoryPath: "", tags: [], tagMode: "append", altText: "" });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [uploadTasks, setUploadTasks] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedAsset, setGeneratedAsset] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const uploadRefs = useRef(new Map());
  const cancelledTaskIds = useRef(new Set());

  const selectedIds = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);
  const uploadBusy = useMemo(() => uploadTasks.some((task) => ACTIVE_UPLOAD_STATUSES.has(task.status)), [uploadTasks]);
  const isManagerTab = tab === "project";
  const visibleFolderItems = useMemo(() => {
    if (page !== 1 || directory || source || tagFilter) return [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return folderItems;
    return folderItems.filter((item) => `${item.displayName} ${item.directoryPath}`.toLowerCase().includes(keyword));
  }, [directory, folderItems, page, query, source, tagFilter]);

  useEffect(() => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    setTab(TABS.includes(initialTab) ? initialTab : "project");

    function closeOnEscape(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [initialTab, onClose, open]);

  useEffect(() => {
    setPage(1);
  }, [directory, limit, query, source, tagFilter]);

  const fetchAssets = useCallback(async () => {
    if (!open || tab === "generate") return;
    setLoading(true);
    setAssetError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (query.trim()) params.set("q", query.trim());
      if (directory) params.set("directory", directory);
      if (source) params.set("source", source);
      if (tagFilter) params.set("tag", tagFilter);

      const response = await fetch(`/api/admin/assets/?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.code === "assetManagerBusy" ? t(labels, "loadBusy") : data.error || t(labels, "loadFailed"));
      }
      const nextTotal = Number(data.total || 0);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / limit));
      setTotalAssets(nextTotal);
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
        return;
      }
      setAssets(data.assets || []);
      setFolders(data.folders || data.directories || []);
      setFolderItems(data.folderItems || []);
      setTags(data.tags || []);
    } catch (error) {
      setAssetError(error.message || t(labels, "loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [directory, labels, limit, open, page, query, source, tab, tagFilter]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(fetchAssets, 220);
    return () => window.clearTimeout(timer);
  }, [fetchAssets, open]);

  function updateTask(taskId, patch) {
    setUploadTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...(typeof patch === "function" ? patch(task) : patch) } : task));
  }

  async function setRemoteUploadStatus(task, status) {
    if (!task?.session?.id) return null;
    const response = await fetch("/api/admin/assets/upload-status/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: task.session.id, status })
    });
    return response.json().catch(() => ({}));
  }

  async function startUploadTask(task) {
    if (!task?.file || task.status === "completed" || task.status === "rejected") return;
    cancelledTaskIds.current.delete(task.id);

    const existingUpload = uploadRefs.current.get(task.id);
    if (existingUpload && (task.status === "paused" || task.status === "cancelled")) {
      updateTask(task.id, { status: "uploading", error: "" });
      existingUpload.start();
      return;
    }

    updateTask(task.id, { status: "preparing", error: "" });

    try {
      const sessionResponse = task.session ? null : await fetch("/api/admin/assets/upload-session/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: task.file.name,
          fileSize: task.file.size,
          contentType: task.file.type || "application/octet-stream",
          relativePath: task.relativePath
        })
      });
      const sessionData = task.session ? { session: task.session, bucket: task.bucket, storagePath: task.storagePath, endpoint: task.endpoint, headers: task.headers, chunkSize: task.chunkSize } : await sessionResponse.json().catch(() => ({}));
      if (sessionResponse && !sessionResponse.ok) {
        throw new Error(validationMessage(labels, sessionData.code) || sessionData.error || t(labels, "uploadFailed"));
      }

      updateTask(task.id, {
        bucket: sessionData.bucket,
        chunkSize: sessionData.chunkSize,
        endpoint: sessionData.endpoint,
        headers: sessionData.headers,
        session: sessionData.session,
        status: "uploading",
        storagePath: sessionData.storagePath
      });

      await new Promise((resolve, reject) => {
        const upload = new tus.Upload(task.file, {
          endpoint: sessionData.endpoint,
          chunkSize: sessionData.chunkSize,
          retryDelays: [0, 1000, 3000, 5000],
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: sessionData.headers || {},
          metadata: {
            bucketName: sessionData.bucket,
            objectName: sessionData.storagePath,
            contentType: task.file.type || "application/octet-stream",
            cacheControl: "3600"
          },
          onError(uploadError) {
            reject(uploadError);
          },
          onProgress(bytesUploaded, bytesTotal) {
            updateTask(task.id, {
              progress: bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0,
              status: "uploading",
              uploadedBytes: bytesUploaded
            });
          },
          async onSuccess() {
            try {
              updateTask(task.id, { status: "finalizing", progress: 100 });
              const completeResponse = await fetch("/api/admin/assets/upload-complete/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId: sessionData.session.id,
                  width: task.dimensions.width || 0,
                  height: task.dimensions.height || 0
                })
              });
              const completeData = await completeResponse.json().catch(() => ({}));
              if (!completeResponse.ok) {
                throw new Error(completeData.error || t(labels, "uploadFailed"));
              }
              resolve(completeData.asset);
            } catch (completeError) {
              reject(completeError);
            }
          }
        });

        uploadRefs.current.set(task.id, upload);
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        }).catch(reject);
      }).then((asset) => {
        updateTask(task.id, { asset, status: "completed", progress: 100, uploadedBytes: task.file.size });
        setSelectedAsset((current) => current || asset);
        setFolders((current) => Array.from(new Set([...current, asset.directoryPath].filter(Boolean))).sort());
        uploadRefs.current.delete(task.id);
        if (tab !== "generate") fetchAssets();
      });
    } catch (error) {
      if (cancelledTaskIds.current.has(task.id)) {
        updateTask(task.id, { status: "cancelled" });
      } else {
        updateTask(task.id, { error: error.message || t(labels, "uploadFailed"), status: "failed" });
      }
    }
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setAssetError("");
    const seenPaths = new Set();
    const nextTasks = [];

    for (const [index, file] of files.entries()) {
      const relativePath = getRelativePath(file);
      const validation = validateAssetFileInput({ name: file.name, type: file.type, size: file.size });
      const duplicateKey = relativePath.toLowerCase();
      if (!validation.ok) {
        nextTasks.push({ id: taskIdFor(file, index), code: validation.code, file, progress: 0, relativePath, status: "rejected" });
        continue;
      }
      if (seenPaths.has(duplicateKey)) {
        nextTasks.push({ id: taskIdFor(file, index), code: "duplicate", file, progress: 0, relativePath, status: "rejected" });
        continue;
      }
      seenPaths.add(duplicateKey);
      nextTasks.push({
        id: taskIdFor(file, index),
        dimensions: await readImageDimensions(file),
        file,
        progress: 0,
        relativePath,
        status: "queued",
        uploadedBytes: 0
      });
    }

    setUploadTasks((current) => [...nextTasks, ...current].slice(0, 80));
    for (const task of nextTasks.filter((item) => item.status === "queued")) {
      await startUploadTask(task);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  async function cancelUploadTask(taskId) {
    const task = uploadTasks.find((item) => item.id === taskId);
    const upload = uploadRefs.current.get(taskId);
    cancelledTaskIds.current.add(taskId);
    if (upload) {
      await upload.abort().catch(() => {});
    }
    updateTask(taskId, { status: "cancelled" });
    await setRemoteUploadStatus(task, "cancelled").catch(() => {});
  }

  function resumeUploadTask(taskId) {
    const task = uploadTasks.find((item) => item.id === taskId);
    if (task) startUploadTask(task);
  }

  async function saveAssetMetadata(asset, draft) {
    setSavingAsset(true);
    setAssetError("");
    try {
      const response = await fetch(`/api/admin/assets/${asset.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: draft.displayName,
          altText: draft.altText,
          directoryPath: draft.directoryPath,
          tags: draft.tags
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(labels, "saveFailed"));
      setSelectedAsset(data.asset);
      setAssets((current) => current.map((item) => item.id === data.asset.id ? data.asset : item));
      setFolders((current) => Array.from(new Set([...current, data.asset.directoryPath].filter(Boolean))).sort());
      setTags((current) => Array.from(new Set([...current, ...(data.asset.tags || [])].filter(Boolean))).sort((left, right) => left.localeCompare(right)));
    } catch (error) {
      setAssetError(error.message || t(labels, "saveFailed"));
    } finally {
      setSavingAsset(false);
    }
  }

  async function createFolder(name) {
    const response = await fetch("/api/admin/assets/folders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || t(labels, "folderFailed"));
    const folder = data.folder;
    if (folder?.directoryPath) {
      setFolders((current) => Array.from(new Set([...current, folder.directoryPath])).sort());
      setFolderItems((current) => {
        if (current.some((item) => item.directoryPath === folder.directoryPath)) return current;
        return [...current, {
          assetCount: 0,
          coverUrl: "",
          directoryPath: folder.directoryPath,
          displayName: folder.displayName || folder.directoryPath.split("/").pop() || folder.directoryPath,
          totalBytes: 0,
          updatedAt: new Date().toISOString()
        }].sort((left, right) => left.directoryPath.localeCompare(right.directoryPath));
      });
    }
    return folder;
  }

  async function createTag(name) {
    const response = await fetch("/api/admin/assets/tags/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || t(labels, "tagFailed"));
    const tag = data.tag;
    if (tag?.name) {
      setTags((current) => Array.from(new Set([...current, tag.name])).sort((left, right) => left.localeCompare(right)));
    }
    return tag;
  }

  async function deleteTag(name) {
    const response = await fetch("/api/admin/assets/tags/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || t(labels, "tagDeleteFailed"));
    const removedName = data.tag?.name || name;
    const keepTag = (tag) => tag.toLowerCase() !== removedName.toLowerCase();
    setTags((current) => current.filter(keepTag));
    setAssets((current) => current.map((asset) => ({
      ...asset,
      tags: (asset.tags || []).filter(keepTag)
    })));
    setSelectedAsset((current) => current ? {
      ...current,
      tags: (current.tags || []).filter(keepTag)
    } : current);
    setBulkDraft((current) => ({
      ...current,
      tags: (current.tags || []).filter(keepTag)
    }));
    if (tagFilter.toLowerCase() === removedName.toLowerCase()) setTagFilter("");
    return data.tag;
  }

  async function createToolbarFolder() {
    const value = toolbarFolderName.trim();
    if (!value) return;
    setCreatingToolbarFolder(true);
    setAssetError("");
    try {
      const folder = await createFolder(value);
      if (folder?.directoryPath) setDirectory(folder.directoryPath);
      setToolbarFolderName("");
      setFolderCreatorOpen(false);
    } catch (error) {
      setAssetError(error.message || t(labels, "folderFailed"));
    } finally {
      setCreatingToolbarFolder(false);
    }
  }

  function toggleAssetSelection(assetId) {
    setSelectedAssetIds((current) => current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]);
  }

  async function applyBulkAction(action = bulkMode) {
    if (!selectedAssetIds.length) return;
    setBulkBusy(true);
    setAssetError("");
    try {
      const response = await fetch("/api/admin/assets/bulk/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          assetIds: selectedAssetIds,
          altText: bulkDraft.altText,
          directoryPath: bulkDraft.directoryPath,
          tagMode: bulkDraft.tagMode,
          tags: bulkDraft.tags
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(labels, "bulkFailed"));

      if (action === "archive") {
        setAssets((current) => current.filter((asset) => !selectedAssetIds.includes(asset.id)));
        if (selectedAsset && selectedAssetIds.includes(selectedAsset.id)) setSelectedAsset(null);
      } else {
        const updated = new Map((data.assets || []).map((asset) => [asset.id, asset]));
        setAssets((current) => current.map((asset) => updated.get(asset.id) || asset));
        if (selectedAsset && updated.has(selectedAsset.id)) setSelectedAsset(updated.get(selectedAsset.id));
        if (action === "move" && bulkDraft.directoryPath) setFolders((current) => Array.from(new Set([...current, bulkDraft.directoryPath])).sort());
        if (action === "tags") setTags((current) => Array.from(new Set([...current, ...bulkDraft.tags])).sort((left, right) => left.localeCompare(right)));
      }
      setSelectedAssetIds([]);
      setBulkMode("");
      setBulkDraft({ directoryPath: "", tags: [], tagMode: "append", altText: "" });
      await fetchAssets();
    } catch (error) {
      setAssetError(error.message || t(labels, "bulkFailed"));
    } finally {
      setBulkBusy(false);
    }
  }

  function confirmBulkDelete() {
    if (!selectedAssetIds.length) return;
    const confirmed = window.confirm(formatTemplate(t(labels, "deleteConfirm"), { count: selectedAssetIds.length }));
    if (confirmed) applyBulkAction("archive");
  }

  function changeDirectory(directoryPath) {
    setPage(1);
    setDirectory(directoryPath);
    setSelectedAsset(null);
    setSelectedAssetIds([]);
    setBulkMode("");
  }

  function openFolder(directoryPath) {
    changeDirectory(directoryPath);
  }

  async function generateAsset(input) {
    setGenerating(true);
    setGenerateError("");
    setGeneratedAsset(null);
    try {
      const response = await fetch("/api/admin/assets/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.code === "generationUnavailable" ? t(labels, "generationUnavailable") : data.error || t(labels, "generateFailed"));
      setGeneratedAsset(data.asset);
      setSelectedAsset(data.asset);
      await fetchAssets();
    } catch (error) {
      setGenerateError(error.message || t(labels, "generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  function saveGeneratedToProject(asset) {
    if (!asset) return;
    setSelectedAsset(asset);
    setSource("generated");
    setDirectory(asset.directoryPath || "");
    setTagFilter("");
    setQuery("");
    setTab("project");
  }

  function downloadAsset(asset) {
    if (!asset?.url) {
      setAssetError(t(labels, "downloadFailed"));
      return;
    }
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.originalFilename || asset.displayName || "image";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function chooseAsset(asset = selectedAsset) {
    if (!asset) return;
    onSelect?.({
      ...asset,
      filename: asset.displayName || asset.originalFilename,
      markdown: `![${escapeMarkdownAlt(asset.altText || asset.displayName || asset.originalFilename)}](${asset.url})`
    });
    onClose?.();
  }

  const tabs = useMemo(() => [
    ["project", t(labels, "projectTab"), FolderOpen],
    ["generate", t(labels, "generateTab"), Sparkles]
  ], [labels]);

  if (!open) return null;

  return (
    <div className="asset-picker-modal" role="dialog" aria-modal="true" aria-label={t(labels, "title")} onPointerDown={() => onClose?.()}>
      <div className="asset-picker-panel" onPointerDown={(event) => event.stopPropagation()}>
        <header className="asset-picker-head">
          <div className="asset-picker-title">
            <h2>{t(labels, "title")}</h2>
            <p>{t(labels, "lead")}</p>
          </div>
          <div className="asset-picker-head-actions">
            {libraryHref ? (
              <a className="button secondary" href={libraryHref}>
                <FolderOpen size={15} aria-hidden="true" />
                {t(labels, "openLibrary")}
              </a>
            ) : null}
            <button className="button secondary" type="button" onClick={() => onClose?.()}>{t(labels, "cancel")}</button>
            <button className="button primary" type="button" onClick={() => chooseAsset()} disabled={!selectedAsset}>
              <Check size={15} aria-hidden="true" />
              {t(labels, "choose")}
            </button>
          </div>
        </header>

        <nav className="asset-picker-tabs" aria-label={t(labels, "tabsLabel")}>
          {tabs.map(([key, label, Icon]) => (
            <button className={tab === key ? "active" : ""} key={key} type="button" onClick={() => setTab(key)}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <input ref={fileInputRef} className="file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.svg" multiple onChange={(event) => uploadFiles(event.target.files)} />
        <input ref={folderInputRef} className="file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.svg" multiple onChange={(event) => uploadFiles(event.target.files)} />

        {assetError ? <p className="asset-picker-error form-message error">{assetError}</p> : null}

        <div className={`asset-picker-body ${isManagerTab ? "asset-manager-body" : ""}`}>
          {isManagerTab ? (
            <UploadPanel
              labels={labels}
              uploadBusy={uploadBusy}
              uploadTasks={uploadTasks}
              dragActive={dragActive}
              onBrowse={() => fileInputRef.current?.click()}
              onBrowseFolder={() => folderInputRef.current?.click()}
              onDropFiles={uploadFiles}
              onDragState={setDragActive}
              onCancelTask={cancelUploadTask}
              onResumeTask={resumeUploadTask}
            />
          ) : null}

          {isManagerTab ? (
            <>
              <section className="asset-browser">
                <div className="asset-browser-controls">
                  <div className="asset-browser-toolbar">
                    <AssetSearch
                      labels={labels}
                      query={query}
                      tags={tags}
                      selectedTag={tagFilter}
                      onQueryChange={setQuery}
                      onTagSelect={setTagFilter}
                      onClearTag={() => setTagFilter("")}
                    />
                    <select value={directory} onChange={(event) => changeDirectory(event.target.value)} aria-label={t(labels, "directoryPath")}>
                      <option value="">{t(labels, "allDirectories")}</option>
                      {folders.map((item) => <option value={item} key={item}>{item}</option>)}
                    </select>
                    <select value={source} onChange={(event) => setSource(event.target.value)} aria-label={t(labels, "source")}>
                      <option value="">{t(labels, "allSources")}</option>
                      {["upload", "folder_upload", "generated"].map((item) => <option value={item} key={item}>{labels.sourceLabels?.[item] || item}</option>)}
                    </select>
                    <button className="button secondary compact asset-new-folder" type="button" onClick={() => setFolderCreatorOpen((current) => !current)}>
                      <Plus size={14} aria-hidden="true" />
                      {t(labels, "newFolder")}
                    </button>
                    <button className="icon-button" type="button" onClick={fetchAssets} title={t(labels, "refresh")} aria-label={t(labels, "refresh")}>
                      <RefreshCw size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <FolderBreadcrumb labels={labels} directory={directory} onSelect={changeDirectory} />
                  {folderCreatorOpen ? (
                    <div className="asset-toolbar-create">
                      <input value={toolbarFolderName} placeholder={t(labels, "folderNamePlaceholder")} onChange={(event) => setToolbarFolderName(event.target.value)} />
                      <button className="button primary compact" type="button" onClick={createToolbarFolder} disabled={creatingToolbarFolder || !toolbarFolderName.trim()}>
                        <Plus size={14} aria-hidden="true" />
                        {creatingToolbarFolder ? t(labels, "saving") : t(labels, "createFolder")}
                      </button>
                    </div>
                  ) : null}
                  <BulkActionBar
                    labels={labels}
                    count={selectedAssetIds.length}
                    activeMode={bulkMode}
                    onMode={(mode) => setBulkMode((current) => current === mode ? "" : mode)}
                    onDelete={confirmBulkDelete}
                    onClear={() => {
                      setSelectedAssetIds([]);
                      setBulkMode("");
                    }}
                  />
                  <BulkActionPanel
                    labels={labels}
                    mode={bulkMode}
                    folders={folders}
                    tags={tags}
                    draft={bulkDraft}
                    busy={bulkBusy}
                    onDraftChange={(patch) => setBulkDraft((current) => ({ ...current, ...patch }))}
                    onCreateTag={createTag}
                    onDeleteTag={deleteTag}
                    onApply={() => applyBulkAction()}
                    onCancel={() => setBulkMode("")}
                  />
                </div>
                <AssetGrid
                  assets={assets}
                  folderItems={visibleFolderItems}
                  labels={labels}
                  locale={locale}
                  selectedAsset={selectedAsset}
                  selectedIds={selectedIds}
                  loading={loading}
                  onOpenFolder={openFolder}
                  onSelect={setSelectedAsset}
                  onToggle={toggleAssetSelection}
                />
                <AssetPagination
                  labels={labels}
                  page={page}
                  limit={limit}
                  total={totalAssets}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    setSelectedAssetIds([]);
                    setBulkMode("");
                  }}
                  onLimitChange={(nextLimit) => {
                    setLimit(nextLimit);
                    setSelectedAssetIds([]);
                    setBulkMode("");
                  }}
                />
              </section>
              <AssetInspector
                asset={selectedAsset}
                labels={labels}
                locale={locale}
                saving={savingAsset}
                folders={folders}
                tags={Array.from(new Set([...tags, ...(selectedAsset?.tags || [])].filter(Boolean)))}
                onCreateTag={createTag}
                onDeleteTag={deleteTag}
                onPreview={setPreviewAsset}
                onSave={saveAssetMetadata}
              />
            </>
          ) : null}

          {tab === "generate" ? (
            <GeneratePanel
              labels={labels}
              generating={generating}
              generatedAsset={generatedAsset}
              error={generateError}
              defaultSize={defaultGenerateSize}
              promptContext={promptContext}
              defaultPromptMode={defaultPromptMode}
              onGenerate={generateAsset}
              onDownloadGenerated={downloadAsset}
              onSaveGenerated={saveGeneratedToProject}
              onSelectGenerated={(asset) => chooseAsset(asset)}
            />
          ) : null}
        </div>

        <AssetOriginalPreview asset={previewAsset} labels={labels} onClose={() => setPreviewAsset(null)} />
      </div>
    </div>
  );
}
