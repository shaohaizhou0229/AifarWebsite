"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Image as ImageIcon, Plus, RefreshCw, Sparkles, UploadCloud, X } from "lucide-react";
import { SitePageSections } from "@/components/SitePageSections";
import sectionTemplateRules from "@/lib/section-template-rules.cjs";
import sectionTemplateUi from "@/lib/section-template-ui.cjs";

const { SECTION_TEMPLATE_INDUSTRIES, SITE_SECTION_TYPES } = sectionTemplateRules;
const { createTemplatePreviewPage } = sectionTemplateUi;
const SUPPORTED_PAGE_KEYS = new Set(["home", "product"]);

function getIndustryLabel(labels, industry) {
  return labels.templateIndustries?.[industry] || industry;
}

function getSectionTypeLabel(labels, type) {
  return labels.sectionTypes?.[type] || type;
}

function getPageLabel(labels, pageKey) {
  if (pageKey === "home") return labels.homePage;
  if (pageKey === "product") return labels.productPage;
  return labels.templateAllPages || pageKey;
}

function getRiskLabel(labels, flag) {
  return labels.aiRiskFlags?.[flag] || flag;
}

function normalizeResponseError(data, fallback, labels) {
  if (data?.code === "recognitionUnavailable") return labels.aiRecognitionUnavailable || fallback;
  if (data?.code === "screenshot_type") return labels.aiInvalidScreenshot || fallback;
  if (data?.code === "screenshot_too_large") return labels.aiInvalidScreenshot || fallback;
  if (data?.code === "screenshot_required") return labels.aiNoScreenshot || fallback;
  return data?.error || fallback;
}

export function SectionRecognitionModal({
  labels,
  locale,
  pageKey,
  pageOptions = [],
  onClose,
  onInsertTemplate
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [industry, setIndustry] = useState("custom");
  const [targetPageKey, setTargetPageKey] = useState(() => SUPPORTED_PAGE_KEYS.has(pageKey) ? pageKey : "");
  const [sectionTypeHint, setSectionTypeHint] = useState("auto");
  const [purposeHint, setPurposeHint] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const targetPages = useMemo(
    () => pageOptions.filter((option) => SUPPORTED_PAGE_KEYS.has(option.key)),
    [pageOptions]
  );
  const previewPage = useMemo(
    () => candidate ? createTemplatePreviewPage(candidate) : null,
    [candidate]
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function updateFile(nextFile) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile || null);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
    setCandidate(null);
    setRecognition(null);
    setError("");
  }

  function onFileChange(event) {
    updateFile(event.target.files?.[0] || null);
    event.target.value = "";
  }

  async function recognizeCandidate() {
    if (!file) {
      setError(labels.aiNoScreenshot || labels.aiRecognitionFailed);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("screenshot", file);
      formData.set("locale", locale || "en");
      formData.set("pageKey", targetPageKey || "");
      formData.set("industry", industry);
      formData.set("sectionTypeHint", sectionTypeHint);
      formData.set("purposeHint", purposeHint);

      const response = await fetch("/api/admin/site-content/section-templates/recognize/", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(normalizeResponseError(data, labels.aiRecognitionFailed, labels));
      }

      setCandidate(data.candidate || null);
      setRecognition(data.recognition || null);
    } catch (recognitionError) {
      setCandidate(null);
      setRecognition(null);
      setError(recognitionError.message || labels.aiRecognitionFailed);
    } finally {
      setBusy(false);
    }
  }

  function insertCandidate() {
    if (!candidate) return;
    onInsertTemplate(candidate);
    onClose();
  }

  return (
    <div className="site-preview-modal" role="dialog" aria-modal="true" aria-label={labels.aiRecognizeTitle} onPointerDown={onClose}>
      <div className="site-preview-modal-panel section-recognition-modal" onPointerDown={(event) => event.stopPropagation()}>
        <header className="site-preview-modal-head section-recognition-head">
          <div>
            <p className="eyebrow">{labels.aiRecognizeBlock}</p>
            <strong>{labels.aiRecognizeTitle}</strong>
            <span>{labels.aiRecognizeLead}</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title={labels.closePreview} aria-label={labels.closePreview}>
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="section-recognition-body">
          <section className="section-recognition-upload" aria-label={labels.aiScreenshot}>
            <label className={`section-recognition-dropzone ${previewUrl ? "has-preview" : ""}`}>
              <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={onFileChange} disabled={busy} />
              {previewUrl ? (
                <img src={previewUrl} alt={file?.name || labels.aiScreenshot} />
              ) : (
                <span>
                  <UploadCloud size={28} aria-hidden="true" />
                  <strong>{labels.aiChooseScreenshot}</strong>
                  <small>{labels.aiScreenshotHint}</small>
                </span>
              )}
            </label>
            {previewUrl ? (
              <div className="section-recognition-file-row">
                <span title={file?.name}>{file?.name}</span>
                <label className="button secondary compact">
                  <ImageIcon size={15} aria-hidden="true" />
                  {labels.aiReplaceScreenshot}
                  <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={onFileChange} disabled={busy} />
                </label>
              </div>
            ) : null}
          </section>

          <section className="section-recognition-controls" aria-label={labels.aiCandidate}>
            <div className="section-recognition-control-grid">
              <label>
                <span>{labels.aiIndustry}</span>
                <select value={industry} onChange={(event) => setIndustry(event.target.value)} disabled={busy}>
                  {SECTION_TEMPLATE_INDUSTRIES.map((item) => (
                    <option value={item} key={item}>{getIndustryLabel(labels, item)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{labels.aiTargetPage}</span>
                <select value={targetPageKey} onChange={(event) => setTargetPageKey(event.target.value)} disabled={busy}>
                  <option value="">{labels.templateAllPages}</option>
                  {targetPages.map((option) => (
                    <option value={option.key} key={option.key}>{option.label || getPageLabel(labels, option.key)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{labels.aiSectionTypeHint}</span>
                <select value={sectionTypeHint} onChange={(event) => setSectionTypeHint(event.target.value)} disabled={busy}>
                  <option value="auto">{labels.aiAutoDetect}</option>
                  {SITE_SECTION_TYPES.map((type) => (
                    <option value={type} key={type}>{getSectionTypeLabel(labels, type)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{labels.aiPurposeHint}</span>
                <input
                  value={purposeHint}
                  maxLength={80}
                  placeholder={labels.aiPurposePlaceholder}
                  onChange={(event) => setPurposeHint(event.target.value)}
                  disabled={busy}
                />
              </label>
            </div>

            <div className="section-recognition-actions">
              <button className="button primary" type="button" onClick={recognizeCandidate} disabled={busy || !file}>
                {busy ? <RefreshCw size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                {busy ? labels.aiAnalyzing : (candidate ? labels.aiReanalyze : labels.aiAnalyzeScreenshot)}
              </button>
              <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
                {labels.closePreview}
              </button>
            </div>

            {error ? (
              <div className="section-recognition-state error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <p>{error}</p>
              </div>
            ) : null}

            {candidate ? (
              <div className="section-recognition-result">
                <div className="section-recognition-result-head">
                  <div>
                    <p className="eyebrow">{labels.aiCandidateReady}</p>
                    <strong>{candidate.name}</strong>
                  </div>
                  <button className="button primary compact" type="button" onClick={insertCandidate}>
                    <Plus size={15} aria-hidden="true" />
                    {labels.aiInsertCandidate}
                  </button>
                </div>
                <div className="template-preview-meta section-recognition-meta">
                  <span>{labels.templateIndustry}: {getIndustryLabel(labels, candidate.industry)}</span>
                  <span>{labels.templatePurpose}: {candidate.purpose || labels.emptyValue}</span>
                  <span>{labels.aiRecognitionConfidence}: {Math.round((recognition?.confidence || 0) * 100)}%</span>
                  <span>{labels.aiSectionTypeHint}: {getSectionTypeLabel(labels, recognition?.detectedSectionType || candidate.content?.sections?.[0]?.type)}</span>
                </div>
                {candidate.riskFlags?.length ? (
                  <div className="template-preview-tags section-recognition-risks" aria-label={labels.aiRecognitionRisks}>
                    {candidate.riskFlags.map((flag) => <span key={flag}>{getRiskLabel(labels, flag)}</span>)}
                  </div>
                ) : null}
                {recognition?.notes?.length ? (
                  <ul className="section-recognition-notes" aria-label={labels.aiRecognitionNotes}>
                    {recognition.notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                ) : null}
                <div className="cms-live-preview section-recognition-preview">
                  <div className="cms-live-preview-page">
                    <SitePageSections page={previewPage} locale={locale} />
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
