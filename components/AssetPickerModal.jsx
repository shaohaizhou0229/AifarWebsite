"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileImage,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";
import assetRules from "@/lib/project-assets-core.cjs";

const TABS = ["upload", "project", "stock", "generate"];
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

function getDirectory(relativePath = "") {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  if (!normalized.includes("/")) return "";
  return normalized.split("/").slice(0, -1).join("/");
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

function AssetInspector({ asset, labels, locale, saving, onSave }) {
  const [draft, setDraft] = useState(() => ({
    displayName: asset?.displayName || "",
    altText: asset?.altText || "",
    directoryPath: asset?.directoryPath || "",
    tags: (asset?.tags || []).join(", ")
  }));

  useEffect(() => {
    setDraft({
      displayName: asset?.displayName || "",
      altText: asset?.altText || "",
      directoryPath: asset?.directoryPath || "",
      tags: (asset?.tags || []).join(", ")
    });
  }, [asset]);

  if (!asset) {
    return (
      <aside className="asset-inspector empty">
        <ImageIcon size={28} aria-hidden="true" />
        <p>{t(labels, "selectAssetHint")}</p>
      </aside>
    );
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
        <input value={draft.directoryPath} onChange={(event) => setDraft((current) => ({ ...current, directoryPath: event.target.value }))} />
      </label>
      <label className="asset-field">
        <span>{t(labels, "tags")}</span>
        <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
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

function GeneratePanel({ labels, generating, generatedAsset, error, onGenerate, onSelectGenerated }) {
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
            <button className="button secondary compact" type="button" onClick={() => onSelectGenerated(generatedAsset)}>
              <Check size={14} aria-hidden="true" />
              {t(labels, "useGenerated")}
            </button>
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
  const [assets, setAssets] = useState([]);
  const [directories, setDirectories] = useState([]);
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
    if (!open || (tab !== "project" && tab !== "stock")) return;
    setLoading(true);
    setAssetError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "36");
      if (query.trim()) params.set("q", query.trim());
      if (directory) params.set("directory", directory);
      const nextSource = tab === "stock" ? "system" : source;
      if (nextSource) params.set("source", nextSource);

      const response = await fetch(`/api/admin/assets/?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(labels, "loadFailed"));
      setAssets(data.assets || []);
      setDirectories(data.directories || []);
    } catch (error) {
      setAssetError(error.message || t(labels, "loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [directory, labels, open, query, source, tab]);

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
    } catch (error) {
      setAssetError(error.message || t(labels, "saveFailed"));
    } finally {
      setSavingAsset(false);
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
    ["stock", t(labels, "stockTab"), ImageIcon],
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

        <div className="asset-picker-body">
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

          {tab === "project" || tab === "stock" ? (
            <>
              <section className="asset-browser">
                <div className="asset-browser-toolbar">
                  <label className="asset-search">
                    <Search size={15} aria-hidden="true" />
                    <input value={query} placeholder={t(labels, "searchPlaceholder")} onChange={(event) => setQuery(event.target.value)} />
                  </label>
                  <select value={directory} onChange={(event) => setDirectory(event.target.value)} aria-label={t(labels, "directoryPath")}>
                    <option value="">{t(labels, "allDirectories")}</option>
                    {directories.map((item) => <option value={item} key={item}>{item}</option>)}
                  </select>
                  {tab === "project" ? (
                    <select value={source} onChange={(event) => setSource(event.target.value)} aria-label={t(labels, "source")}>
                      <option value="">{t(labels, "allSources")}</option>
                      {["upload", "folder_upload", "generated"].map((item) => <option value={item} key={item}>{labels.sourceLabels?.[item] || item}</option>)}
                    </select>
                  ) : null}
                  <button className="icon-button" type="button" onClick={fetchAssets} title={t(labels, "refresh")} aria-label={t(labels, "refresh")}>
                    <RefreshCw size={16} aria-hidden="true" />
                  </button>
                </div>
                <AssetGrid assets={assets} labels={labels} locale={locale} selectedAsset={selectedAsset} loading={loading} onSelect={setSelectedAsset} />
              </section>
              <AssetInspector asset={selectedAsset} labels={labels} locale={locale} saving={savingAsset} onSave={saveAssetMetadata} />
            </>
          ) : null}

          {tab === "generate" ? (
            <GeneratePanel
              labels={labels}
              generating={generating}
              generatedAsset={generatedAsset}
              error={generateError}
              onGenerate={generateAsset}
              onSelectGenerated={(asset) => chooseAsset(asset)}
            />
          ) : null}
        </div>

        <footer className="asset-picker-footer">
          <button className="button secondary" type="button" onClick={() => onClose?.()}>{t(labels, "cancel")}</button>
          <button className="button secondary" type="button" disabled={!selectedAsset}>{t(labels, "customize")}</button>
          <button className="button primary" type="button" onClick={() => chooseAsset()} disabled={!selectedAsset}>
            <Check size={15} aria-hidden="true" />
            {t(labels, "choose")}
          </button>
        </footer>
      </div>
    </div>
  );
}
