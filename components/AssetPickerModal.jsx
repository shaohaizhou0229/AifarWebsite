"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FileImage,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  UploadCloud,
  X
} from "lucide-react";
import assetRules from "@/lib/project-assets-core.cjs";

const TABS = ["upload", "project", "generate"];
const IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
const IMAGE_QUALITIES = ["auto", "low", "medium", "high"];
const { validateAssetFileInput } = assetRules;

function t(labels, key) {
  return labels?.[key] || key;
}

function validationMessage(labels, code) {
  return labels?.validation?.[code] || labels?.uploadFailed || code;
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

function AssetCard({ asset, labels, locale, selected, onSelect }) {
  return (
    <button className={`asset-card ${selected ? "selected" : ""}`} type="button" onClick={() => onSelect(asset)}>
      <span className="asset-card-thumb">
        {asset.url ? <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} loading="lazy" /> : <ImageIcon size={30} aria-hidden="true" />}
      </span>
      <span className="asset-card-body">
        <strong title={asset.displayName}>{asset.displayName || asset.originalFilename}</strong>
        <small>{[asset.directoryPath, formatBytes(asset.fileSize, labels)].filter(Boolean).join(" / ")}</small>
        <small>{labels.sourceLabels?.[asset.source] || asset.source} · {formatDate(asset.updatedAt, locale)}</small>
      </span>
      {selected ? <span className="asset-card-check"><Check size={14} aria-hidden="true" /></span> : null}
    </button>
  );
}

function AssetGrid({ assets, labels, locale, selectedAsset, loading, onSelect }) {
  if (loading) {
    return (
      <div className="asset-empty-state">
        <Loader2 className="spin" size={24} aria-hidden="true" />
        <p>{t(labels, "loading")}</p>
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="asset-empty-state">
        <FileImage size={28} aria-hidden="true" />
        <p>{t(labels, "noAssets")}</p>
      </div>
    );
  }

  return (
    <div className="asset-grid">
      {assets.map((asset) => (
        <AssetCard
          asset={asset}
          key={asset.id}
          labels={labels}
          locale={locale}
          selected={selectedAsset?.id === asset.id}
          onSelect={onSelect}
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
      <label className="asset-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={query}
          placeholder={t(labels, "searchPlaceholder")}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => setFocused(true)}
        />
      </label>
      {selectedTag ? (
        <button className="asset-active-filter" type="button" onClick={onClearTag}>
          <Tag size={13} aria-hidden="true" />
          <span>{selectedTag}</span>
          <X size={12} aria-hidden="true" />
        </button>
      ) : null}
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

function TagPicker({ labels, availableTags, selectedTags, onChange, onCreateTag }) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((item) => item !== tag));
      return;
    }
    onChange([...selectedTags, tag].slice(0, 12));
  }

  async function submitTag() {
    const value = newTag.trim();
    if (!value) return;
    setCreating(true);
    setError("");
    try {
      const created = await onCreateTag(value);
      const tagName = created?.name || value;
      if (!selectedTags.includes(tagName)) {
        onChange([...selectedTags, tagName].slice(0, 12));
      }
      setNewTag("");
    } catch (createError) {
      setError(createError.message || t(labels, "tagFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="asset-tag-picker">
      <button className="asset-tag-control" type="button" onClick={() => setOpen((current) => !current)}>
        {selectedTags.length ? (
          selectedTags.map((tag) => <span className="asset-chip" key={tag}>{tag}</span>)
        ) : (
          <span className="asset-tag-placeholder">{t(labels, "noTags")}</span>
        )}
      </button>
      {open ? (
        <div className="asset-tag-popover">
          <div className="asset-chip-row">
            {availableTags.map((tag) => (
              <button className={selectedTags.includes(tag) ? "selected" : ""} key={tag} type="button" onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
          <div className="asset-inline-create">
            <input value={newTag} placeholder={t(labels, "tagNamePlaceholder")} onChange={(event) => setNewTag(event.target.value)} />
            <button className="button secondary compact" type="button" onClick={submitTag} disabled={creating || !newTag.trim()}>
              <Plus size={13} aria-hidden="true" />
              {creating ? t(labels, "saving") : t(labels, "createTag")}
            </button>
          </div>
          {error ? <p className="form-message error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function AssetInspector({ asset, labels, locale, saving, folders, tags, onCreateFolder, onCreateTag, onSave }) {
  const [draft, setDraft] = useState(() => ({
    displayName: asset?.displayName || "",
    altText: asset?.altText || "",
    directoryPath: asset?.directoryPath || "",
    tags: asset?.tags || []
  }));
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");

  useEffect(() => {
    setDraft({
      displayName: asset?.displayName || "",
      altText: asset?.altText || "",
      directoryPath: asset?.directoryPath || "",
      tags: asset?.tags || []
    });
  }, [asset]);

  if (!asset) {
    return null;
  }

  async function submitFolder() {
    const value = folderName.trim();
    if (!value) return;
    setCreatingFolder(true);
    setFolderError("");
    try {
      const folder = await onCreateFolder(value);
      setDraft((current) => ({ ...current, directoryPath: folder?.directoryPath || value }));
      setFolderName("");
    } catch (error) {
      setFolderError(error.message || t(labels, "folderFailed"));
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <aside className="asset-inspector">
      <div className="asset-inspector-preview">
        <img src={asset.url} alt={asset.altText || asset.displayName || asset.originalFilename} loading="lazy" />
      </div>
      <div className="asset-inspector-meta">
        <span>{labels.sourceLabels?.[asset.source] || asset.source}</span>
        <span>{formatBytes(asset.fileSize, labels)}</span>
        {asset.width && asset.height ? <span>{asset.width} x {asset.height}</span> : null}
        <span>{formatDate(asset.updatedAt, locale)}</span>
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
      <div className="asset-inline-create">
        <input value={folderName} placeholder={t(labels, "folderNamePlaceholder")} onChange={(event) => setFolderName(event.target.value)} />
        <button className="button secondary compact" type="button" onClick={submitFolder} disabled={creatingFolder || !folderName.trim()}>
          <Plus size={13} aria-hidden="true" />
          {creatingFolder ? t(labels, "saving") : t(labels, "createFolder")}
        </button>
      </div>
      {folderError ? <p className="form-message error">{folderError}</p> : null}
      <label className="asset-field">
        <span>{t(labels, "tags")}</span>
        <TagPicker
          labels={labels}
          availableTags={tags}
          selectedTags={draft.tags}
          onChange={(nextTags) => setDraft((current) => ({ ...current, tags: nextTags }))}
          onCreateTag={onCreateTag}
        />
      </label>
      <button className="button secondary compact" type="button" onClick={() => onSave(asset, draft)} disabled={saving || !draft.displayName.trim()}>
        <Pencil size={14} aria-hidden="true" />
        {saving ? t(labels, "saving") : t(labels, "saveMetadata")}
      </button>
    </aside>
  );
}

function UploadPanel({ labels, uploadBusy, uploadResults, dragActive, onBrowse, onBrowseFolder, onDropFiles, onDragState }) {
  return (
    <div className="asset-upload-panel">
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
        <UploadCloud size={38} aria-hidden="true" />
        <strong>{uploadBusy ? t(labels, "uploading") : t(labels, "dropTitle")}</strong>
        <p>{t(labels, "formatHint")}</p>
        <div className="asset-dropzone-actions">
          <button className="button primary compact" type="button" onClick={onBrowse} disabled={uploadBusy}>
            <FileImage size={14} aria-hidden="true" />
            {t(labels, "browseImages")}
          </button>
          <button className="button secondary compact" type="button" onClick={onBrowseFolder} disabled={uploadBusy}>
            <FolderOpen size={14} aria-hidden="true" />
            {t(labels, "browseFolder")}
          </button>
        </div>
      </div>
      {uploadResults.length ? (
        <div className="asset-upload-results">
          {uploadResults.map((result, index) => (
            <div className={`asset-upload-result ${result.ok ? "success" : "error"}`} key={`${result.filename || result.asset?.id || index}-${index}`}>
              <span>{result.ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}</span>
              <div>
                <strong>{result.asset?.displayName || result.filename}</strong>
                <small>{result.ok ? t(labels, "uploaded") : validationMessage(labels, result.code)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GeneratePanel({ labels, generating, generatedAsset, error, onDownloadGenerated, onGenerate, onSaveGenerated, onSelectGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("auto");

  return (
    <div className="asset-generate-panel">
      <section className="asset-generate-form">
        <label className="asset-field">
          <span>{t(labels, "prompt")}</span>
          <textarea value={prompt} placeholder={t(labels, "promptPlaceholder")} onChange={(event) => setPrompt(event.target.value)} />
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
        <button className="button primary" type="button" onClick={() => onGenerate({ prompt, size, quality })} disabled={generating || !prompt.trim()}>
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

export function AssetPickerModal({ open, labels = {}, locale = "en", onClose, onSelect, initialTab = "project" }) {
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
  const [tags, setTags] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedAsset, setGeneratedAsset] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const fetchAssets = useCallback(async () => {
    if (!open || tab !== "project") return;
    setLoading(true);
    setAssetError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "36");
      if (query.trim()) params.set("q", query.trim());
      if (directory) params.set("directory", directory);
      if (source) params.set("source", source);
      if (tagFilter) params.set("tag", tagFilter);

      const response = await fetch(`/api/admin/assets/?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(labels, "loadFailed"));
      setAssets(data.assets || []);
      setFolders(data.folders || data.directories || []);
      setTags(data.tags || []);
    } catch (error) {
      setAssetError(error.message || t(labels, "loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [directory, labels, open, query, source, tab, tagFilter]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(fetchAssets, 220);
    return () => window.clearTimeout(timer);
  }, [fetchAssets, open]);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setUploadBusy(true);
    setUploadResults([]);
    setAssetError("");

    try {
      const seenPaths = new Set();
      const rejected = [];
      const accepted = [];

      for (const file of files) {
        const relativePath = getRelativePath(file);
        const validation = validateAssetFileInput({ name: file.name, type: file.type, size: file.size });
        const duplicateKey = relativePath.toLowerCase();
        if (!validation.ok) {
          rejected.push({ ok: false, filename: relativePath, code: validation.code });
          continue;
        }
        if (seenPaths.has(duplicateKey)) {
          rejected.push({ ok: false, filename: relativePath, code: "duplicate" });
          continue;
        }
        seenPaths.add(duplicateKey);
        accepted.push({ file, relativePath, dimensions: await readImageDimensions(file) });
      }

      if (!accepted.length) {
        setUploadResults(rejected);
        return;
      }

      const formData = new FormData();
      for (const item of accepted) {
        formData.append("files", item.file);
        formData.append("relativePaths", item.relativePath);
        formData.append("widths", String(item.dimensions.width || 0));
        formData.append("heights", String(item.dimensions.height || 0));
      }

      const response = await fetch("/api/admin/assets/upload/", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(labels, "uploadFailed"));

      const results = [
        ...rejected,
        ...(data.results || []).map((result, index) => ({
          ...result,
          filename: result.filename || accepted[index]?.relativePath || result.asset?.originalFilename || ""
        }))
      ];
      setUploadResults(results);
      const firstAsset = results.find((result) => result.ok)?.asset;
      if (firstAsset) {
        setSelectedAsset(firstAsset);
        setTab("project");
      }
      await fetchAssets();
    } catch (error) {
      setAssetError(error.message || t(labels, "uploadFailed"));
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
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
    ["upload", t(labels, "uploadTab"), UploadCloud],
    ["project", t(labels, "projectTab"), FolderOpen],
    ["generate", t(labels, "generateTab"), Sparkles]
  ], [labels]);

  if (!open) return null;

  return (
    <div className="asset-picker-modal" role="dialog" aria-modal="true" aria-label={t(labels, "title")} onPointerDown={() => onClose?.()}>
      <div className="asset-picker-panel" onPointerDown={(event) => event.stopPropagation()}>
        <header className="asset-picker-head">
          <div>
            <h2>{t(labels, "title")}</h2>
            <p>{t(labels, "lead")}</p>
          </div>
          <button className="icon-button" type="button" onClick={() => onClose?.()} title={t(labels, "close")} aria-label={t(labels, "close")}>
            <X size={18} aria-hidden="true" />
          </button>
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

        <div className={`asset-picker-body ${tab === "project" && !selectedAsset ? "no-inspector" : ""}`}>
          {tab === "upload" ? (
            <UploadPanel
              labels={labels}
              uploadBusy={uploadBusy}
              uploadResults={uploadResults}
              dragActive={dragActive}
              onBrowse={() => fileInputRef.current?.click()}
              onBrowseFolder={() => folderInputRef.current?.click()}
              onDropFiles={uploadFiles}
              onDragState={setDragActive}
            />
          ) : null}

          {tab === "project" ? (
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
                    <select value={directory} onChange={(event) => setDirectory(event.target.value)} aria-label={t(labels, "directoryPath")}>
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
                  {folderCreatorOpen ? (
                    <div className="asset-toolbar-create">
                      <input value={toolbarFolderName} placeholder={t(labels, "folderNamePlaceholder")} onChange={(event) => setToolbarFolderName(event.target.value)} />
                      <button className="button primary compact" type="button" onClick={createToolbarFolder} disabled={creatingToolbarFolder || !toolbarFolderName.trim()}>
                        <Plus size={14} aria-hidden="true" />
                        {creatingToolbarFolder ? t(labels, "saving") : t(labels, "createFolder")}
                      </button>
                    </div>
                  ) : null}
                </div>
                <AssetGrid assets={assets} labels={labels} locale={locale} selectedAsset={selectedAsset} loading={loading} onSelect={setSelectedAsset} />
              </section>
              <AssetInspector
                asset={selectedAsset}
                labels={labels}
                locale={locale}
                saving={savingAsset}
                folders={folders}
                tags={Array.from(new Set([...tags, ...(selectedAsset?.tags || [])].filter(Boolean)))}
                onCreateFolder={createFolder}
                onCreateTag={createTag}
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
              onGenerate={generateAsset}
              onDownloadGenerated={downloadAsset}
              onSaveGenerated={saveGeneratedToProject}
              onSelectGenerated={(asset) => chooseAsset(asset)}
            />
          ) : null}
        </div>

        <footer className="asset-picker-footer">
          <button className="button secondary" type="button" onClick={() => onClose?.()}>{t(labels, "cancel")}</button>
          <button className="button primary" type="button" onClick={() => chooseAsset()} disabled={!selectedAsset}>
            <Check size={15} aria-hidden="true" />
            {t(labels, "choose")}
          </button>
        </footer>
      </div>
    </div>
  );
}
