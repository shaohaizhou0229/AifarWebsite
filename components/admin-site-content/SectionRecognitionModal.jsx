"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Image as ImageIcon, Plus, RefreshCw, Save, Sparkles, UploadCloud, X } from "lucide-react";
import { SitePageSections } from "@/components/SitePageSections";
import sectionTemplateRules from "@/lib/section-template-rules.cjs";
import sectionTemplateUi from "@/lib/section-template-ui.cjs";

const { SECTION_TEMPLATE_INDUSTRIES, SITE_SECTION_TYPES } = sectionTemplateRules;
const { createTemplateMetadataDraft, createTemplatePreviewPage } = sectionTemplateUi;
const SUPPORTED_PAGE_KEYS = new Set(["home", "product"]);
const CLIENT_RECOGNITION_TIMEOUT_MS = 70000;

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
  if (data?.code === "recognitionUnavailable") return { code: data.code, message: labels.aiRecognitionUnavailable || fallback };
  if (data?.code === "recognition_timeout") return { code: data.code, message: labels.aiRecognitionTimeout || fallback };
  if (data?.code === "screenshot_type") return { code: data.code, message: labels.aiInvalidScreenshot || fallback };
  if (data?.code === "screenshot_too_large") return { code: data.code, message: labels.aiInvalidScreenshot || fallback };
  if (data?.code === "screenshot_required") return { code: data.code, message: labels.aiNoScreenshot || fallback };
  return { code: data?.code || "", message: data?.error || fallback };
}

export function SectionRecognitionModal({
  labels,
  locale,
  pageKey,
  pageOptions = [],
  canManageAiSettings = false,
  aiSettingsHref = "",
  onClose,
  onInsertTemplate,
  onSaveTemplate
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [industry, setIndustry] = useState("custom");
  const [targetPageKey, setTargetPageKey] = useState(() => SUPPORTED_PAGE_KEYS.has(pageKey) ? pageKey : "");
  const [sectionTypeHint, setSectionTypeHint] = useState("auto");
  const [purposeHint, setPurposeHint] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [candidateDraft, setCandidateDraft] = useState(() => createTemplateMetadataDraft(null));
  const [savedTemplate, setSavedTemplate] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

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

  useEffect(() => {
    if (!candidate) return;
    setCandidateDraft(createTemplateMetadataDraft(candidate));
    setSavedTemplate(null);
  }, [candidate]);

  function updateFile(nextFile) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile || null);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
    setCandidate(null);
    setSavedTemplate(null);
    setRecognition(null);
    setError("");
    setErrorCode("");
  }

  function onFileChange(event) {
    updateFile(event.target.files?.[0] || null);
    event.target.value = "";
  }

  async function recognizeCandidate() {
    if (!file) {
      setError(labels.aiNoScreenshot || labels.aiRecognitionFailed);
      setErrorCode("screenshot_required");
      return;
    }

    setBusy(true);
    setError("");
    setErrorCode("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_RECOGNITION_TIMEOUT_MS);

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
        signal: controller.signal,
        body: formData
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const normalizedError = normalizeResponseError(data, labels.aiRecognitionFailed, labels);
        const error = new Error(normalizedError.message);
        error.code = normalizedError.code;
        throw error;
      }

      setCandidate(data.candidate || null);
      setRecognition(data.recognition || null);
      setErrorCode("");
    } catch (recognitionError) {
      setCandidate(null);
      setRecognition(null);
      const message = recognitionError?.name === "AbortError"
        ? labels.aiRecognitionTimeout
        : recognitionError.message;
      setError(message || labels.aiRecognitionFailed);
      setErrorCode(recognitionError?.name === "AbortError" ? "recognition_timeout" : recognitionError?.code || "");
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  function insertCandidate() {
    if (!candidate) return;
    onInsertTemplate(savedTemplate || candidate);
    onClose();
  }

  function patchCandidateDraft(key, value) {
    setCandidateDraft((current) => ({ ...current, [key]: value }));
    setSavedTemplate(null);
  }

  async function saveCandidateTemplate() {
    if (!candidate || !onSaveTemplate) return;
    setSavingTemplate(true);
    setError("");
    setErrorCode("");
    try {
      const template = await onSaveTemplate(candidate, candidateDraft);
      setSavedTemplate(template || null);
    } catch (saveError) {
      setError(saveError.message || labels.aiTemplateSaveFailed);
    } finally {
      setSavingTemplate(false);
    }
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
                <div>
                  <p>{error}</p>
                  {errorCode === "recognitionUnavailable" ? (
                    <div className="section-recognition-help">
                      <span>{labels.aiRecognitionConfigHint}</span>
                      {canManageAiSettings && aiSettingsHref ? (
                        <a className="button secondary compact" href={aiSettingsHref}>
                          {labels.aiOpenSettings}
                        </a>
                      ) : (
                        <small>{labels.aiAskAdminSettings}</small>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {candidate ? (
              <div className="section-recognition-result">
                <div className="section-recognition-result-head">
                  <div>
                    <p className="eyebrow">{labels.aiCandidateReady}</p>
                    <strong>{candidateDraft.name || candidate.name}</strong>
                  </div>
                  <div className="section-recognition-result-actions">
                    <button className="button secondary compact" type="button" onClick={saveCandidateTemplate} disabled={savingTemplate || busy || Boolean(savedTemplate) || !onSaveTemplate}>
                      <Save size={15} aria-hidden="true" />
                      {savingTemplate ? labels.saving : savedTemplate ? labels.aiTemplateSavedShort : labels.saveAiSectionTemplate}
                    </button>
                    <button className="button primary compact" type="button" onClick={insertCandidate} disabled={savingTemplate}>
                      <Plus size={15} aria-hidden="true" />
                      {labels.aiInsertCandidate}
                    </button>
                  </div>
                </div>
                <div className="section-recognition-candidate-form">
                  <label>
                    <span>{labels.templateName}</span>
                    <input value={candidateDraft.name} onChange={(event) => patchCandidateDraft("name", event.target.value)} maxLength={80} disabled={savingTemplate || busy} />
                  </label>
                  <label>
                    <span>{labels.templateDescription}</span>
                    <textarea value={candidateDraft.description} onChange={(event) => patchCandidateDraft("description", event.target.value)} maxLength={180} rows={2} disabled={savingTemplate || busy} />
                  </label>
                  <label>
                    <span>{labels.templateIndustry}</span>
                    <select value={candidateDraft.industry} onChange={(event) => patchCandidateDraft("industry", event.target.value)} disabled={savingTemplate || busy}>
                      {SECTION_TEMPLATE_INDUSTRIES.map((item) => (
                        <option value={item} key={item}>{getIndustryLabel(labels, item)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{labels.templatePageScope}</span>
                    <select value={candidateDraft.pageKey} onChange={(event) => patchCandidateDraft("pageKey", event.target.value)} disabled={savingTemplate || busy}>
                      <option value="">{labels.templateAllPages}</option>
                      {targetPages.map((option) => (
                        <option value={option.key} key={option.key}>{option.label || getPageLabel(labels, option.key)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{labels.templatePurpose}</span>
                    <input value={candidateDraft.purpose} onChange={(event) => patchCandidateDraft("purpose", event.target.value)} maxLength={80} disabled={savingTemplate || busy} />
                  </label>
                  <label>
                    <span>{labels.templateTags}</span>
                    <input value={candidateDraft.tagsText} onChange={(event) => patchCandidateDraft("tagsText", event.target.value)} placeholder={labels.templateTagsPlaceholder} maxLength={160} disabled={savingTemplate || busy} />
                  </label>
                </div>
                {savedTemplate ? <p className="form-message success">{labels.aiTemplateSaved}</p> : null}
                <div className="template-preview-meta section-recognition-meta">
                  <span>{labels.templateIndustry}: {getIndustryLabel(labels, candidateDraft.industry || candidate.industry)}</span>
                  <span>{labels.templatePurpose}: {candidateDraft.purpose || candidate.purpose || labels.emptyValue}</span>
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
