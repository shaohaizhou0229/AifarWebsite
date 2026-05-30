"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Save, ShieldCheck, Sparkles, TestTube2, XCircle } from "lucide-react";

const TEST_TARGETS = {
  imageGeneration: "imageGeneration",
  sectionTemplateRecognition: "sectionTemplateRecognition"
};

const IDLE_TEST_STATE = { status: "idle", message: "", checkedAt: "" };

function statusClass(configured) {
  return configured ? "success" : "warning";
}

function enabledLabel(labels, enabled) {
  return enabled ? labels.enabledYes : labels.enabledNo;
}

function formatTimeout(labels, timeoutMs) {
  const value = Number(timeoutMs || 0);
  return value > 0 ? `${value} ${labels.milliseconds}` : labels.notConfigured;
}

function formatUatMode(labels, settings = {}) {
  if (settings.uatModeEnabled) return labels.uatModeEnabled;
  if (settings.uatModeRequested && !settings.uatModeAvailable) return labels.uatModeUnavailable;
  return labels.uatModeDisabled;
}

function resolveTestMessage(labels, result, fallback) {
  if (result?.ok && result?.mode === "uat") return labels.testUatSuccess || labels.testSuccess;
  if (result?.ok) return labels.testSuccess;
  return labels.testErrorCodes?.[result?.code] || result?.error || fallback;
}

function ServiceCard({ labels, target, title, lead, settings, fields, testState, onTest }) {
  const configured = Boolean(settings?.configured);
  const loading = testState.status === "loading";

  return (
    <article className="admin-panel ai-service-card">
      <div className="admin-panel-header">
        <div>
          <span className="admin-eyebrow">{labels.serviceEyebrow}</span>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        <span className={`admin-status admin-status-${statusClass(configured)}`}>
          {configured ? labels.configured : labels.notConfigured}
        </span>
      </div>
      <dl className="ai-settings-list">
        {fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value || labels.notConfigured}</dd>
          </div>
        ))}
      </dl>
      <div className="admin-actions-row">
        <button className="button primary" type="button" onClick={() => onTest(target)} disabled={loading}>
          <TestTube2 size={16} aria-hidden="true" />
          {loading ? labels.testing : labels.testConnection}
        </button>
        <a className="button secondary" href="#ai-env-guide">
          <KeyRound size={16} aria-hidden="true" />
          {labels.envGuide}
        </a>
      </div>
      {testState.message ? (
        <p className={`form-message ${testState.status === "success" ? "success" : "error"}`} role={testState.status === "error" ? "alert" : "status"} aria-live="polite">
          {testState.message}
        </p>
      ) : null}
    </article>
  );
}

function FormField({ label, children }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AdminAiSettingsClient({ labels, settings, draft }) {
  const [settingsState, setSettingsState] = useState(settings || {});
  const imageGeneration = settingsState?.imageGeneration || settingsState || {};
  const sectionTemplateRecognition = settingsState?.sectionTemplateRecognition || {};
  const [form, setForm] = useState(draft || {});
  const [secretForm, setSecretForm] = useState({ OPENAI_API_KEY: "", SILICONFLOW_API_KEY: "" });
  const [saveState, setSaveState] = useState({ status: "idle", message: "" });
  const [testStates, setTestStates] = useState({
    [TEST_TARGETS.imageGeneration]: IDLE_TEST_STATE,
    [TEST_TARGETS.sectionTemplateRecognition]: IDLE_TEST_STATE
  });
  const allConfigured = Boolean(imageGeneration?.configured && sectionTemplateRecognition?.configured);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateSecret(name, value) {
    setSecretForm((current) => ({ ...current, [name]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaveState({ status: "loading", message: labels.saving || "Saving..." });
    try {
      const response = await fetch("/api/admin/settings/ai/status/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: form,
          secrets: Object.fromEntries(Object.entries(secretForm).filter(([, value]) => String(value || "").trim()))
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || labels.saveFailed || "Could not save AI settings.");
      if (result.settings) setSettingsState(result.settings);
      setForm(result.draft || form);
      setSecretForm({ OPENAI_API_KEY: "", SILICONFLOW_API_KEY: "" });
      setSaveState({ status: "success", message: labels.saveSuccess || "AI settings saved." });
    } catch (error) {
      setSaveState({ status: "error", message: error.message || labels.saveFailed || "Could not save AI settings." });
    }
  }

  async function testConnection(target) {
    setTestStates((current) => ({
      ...current,
      [target]: { status: "loading", message: labels.testing, checkedAt: "" }
    }));
    try {
      const response = await fetch("/api/admin/settings/ai/test/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        const error = new Error(resolveTestMessage(labels, result, labels.testFailed));
        error.result = result;
        throw error;
      }
      setTestStates((current) => ({
        ...current,
        [target]: {
          status: "success",
          message: resolveTestMessage(labels, result, labels.testSuccess),
          checkedAt: result.checkedAt || new Date().toISOString()
        }
      }));
    } catch (error) {
      setTestStates((current) => ({
        ...current,
        [target]: { status: "error", message: error.message || labels.testFailed, checkedAt: "" }
      }));
    }
  }

  const imageFields = [
    { label: labels.provider, value: imageGeneration.provider },
    { label: labels.baseUrl, value: imageGeneration.baseUrl },
    { label: labels.enabled, value: enabledLabel(labels, imageGeneration.enabled) },
    { label: labels.apiKey, value: imageGeneration.apiKeyPreview || labels.notConfigured },
    { label: labels.model, value: imageGeneration.model || labels.notConfigured },
    { label: labels.outputFormat, value: imageGeneration.outputFormat }
  ];
  const recognitionFields = [
    { label: labels.provider, value: sectionTemplateRecognition.provider },
    { label: labels.baseUrl, value: sectionTemplateRecognition.baseUrl },
    { label: labels.enabled, value: enabledLabel(labels, sectionTemplateRecognition.enabled) },
    { label: labels.apiKey, value: sectionTemplateRecognition.apiKeyPreview || labels.notConfigured },
    { label: labels.model, value: sectionTemplateRecognition.model || labels.notConfigured },
    ...(sectionTemplateRecognition.visionModel ? [{ label: labels.visionModel, value: sectionTemplateRecognition.visionModel }] : []),
    ...(sectionTemplateRecognition.textModel ? [{ label: labels.textModel, value: sectionTemplateRecognition.textModel }] : []),
    { label: labels.timeoutMs, value: formatTimeout(labels, sectionTemplateRecognition.timeoutMs) },
    { label: labels.uatMode, value: formatUatMode(labels, sectionTemplateRecognition) }
  ];

  return (
    <section className="ai-settings-shell">
      <div className="ai-settings-main">
        <ServiceCard
          labels={labels}
          target={TEST_TARGETS.imageGeneration}
          title={labels.imageServiceTitle || labels.serviceTitle}
          lead={labels.imageServiceLead || labels.serviceLead}
          settings={imageGeneration}
          fields={imageFields}
          testState={testStates[TEST_TARGETS.imageGeneration]}
          onTest={testConnection}
        />
        <ServiceCard
          labels={labels}
          target={TEST_TARGETS.sectionTemplateRecognition}
          title={labels.recognitionServiceTitle}
          lead={labels.recognitionServiceLead}
          settings={sectionTemplateRecognition}
          fields={recognitionFields}
          testState={testStates[TEST_TARGETS.sectionTemplateRecognition]}
          onTest={testConnection}
        />

        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">{labels.defaultsEyebrow}</span>
              <h2>{labels.defaultsTitle}</h2>
            </div>
          </div>
          <div className="ai-settings-grid">
            <label>
              <span>{labels.enabled}</span>
              <input autoComplete="off" name="aiImageEnabled" value={enabledLabel(labels, imageGeneration.enabled)} readOnly />
            </label>
            <label>
              <span>{labels.defaultSize}</span>
              <input autoComplete="off" name="aiDefaultTargetSize" value={imageGeneration.defaultSize || labels.notConfigured} readOnly />
            </label>
            <label>
              <span>{labels.defaultQuality}</span>
              <input autoComplete="off" name="aiDefaultQuality" value={labels.qualityLabels?.[imageGeneration.defaultQuality] || imageGeneration.defaultQuality || labels.notConfigured} readOnly />
            </label>
            <label>
              <span>{labels.defaultOutput}</span>
              <input autoComplete="off" name="aiDefaultOutput" value={imageGeneration.outputFormat || labels.notConfigured} readOnly />
            </label>
          </div>
          <div className="ai-settings-options">
            <strong>{labels.availableSizes}</strong>
            <div>
              {(imageGeneration.supportedSizes || []).map((size) => <span key={size}>{size}</span>)}
            </div>
          </div>
          <div className="ai-size-rule-card">
            <strong>{labels.sizeMatchingRule}</strong>
            <p>{labels.sizeMatchingRuleLead}</p>
          </div>
          <p className="muted-line">{labels.envManagedHint}</p>
        </article>

        <form className="admin-panel ai-settings-edit-form" onSubmit={saveSettings}>
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">{labels.editEyebrow || labels.defaultsEyebrow}</span>
              <h2>{labels.editTitle || labels.title}</h2>
              <p>{labels.editLead || labels.lead}</p>
            </div>
            <span className="admin-status admin-status-success">{labels.environment}: {settingsState?.environmentKey || "development"}</span>
          </div>

          <div className="ai-settings-grid">
            <FormField label={labels.imageProvider || labels.provider}>
              <select value={form.AI_IMAGE_PROVIDER || "openai"} onChange={(event) => updateField("AI_IMAGE_PROVIDER", event.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="siliconflow">SiliconFlow</option>
              </select>
            </FormField>
            <FormField label={labels.enabled}>
              <select value={form.AI_IMAGE_ENABLED || "true"} onChange={(event) => updateField("AI_IMAGE_ENABLED", event.target.value)}>
                <option value="true">{labels.enabledYes}</option>
                <option value="false">{labels.enabledNo}</option>
              </select>
            </FormField>
            <FormField label={labels.openAiApiKey}>
              <input type="password" autoComplete="new-password" value={secretForm.OPENAI_API_KEY} placeholder={imageGeneration.apiKeyPreview || labels.keepExistingSecret || ""} onChange={(event) => updateSecret("OPENAI_API_KEY", event.target.value)} />
            </FormField>
            <FormField label={labels.siliconFlowApiKey}>
              <input type="password" autoComplete="new-password" value={secretForm.SILICONFLOW_API_KEY} placeholder={sectionTemplateRecognition.apiKeyPreview || labels.keepExistingSecret || ""} onChange={(event) => updateSecret("SILICONFLOW_API_KEY", event.target.value)} />
            </FormField>
            <FormField label={labels.baseUrl}>
              <input value={form.SILICONFLOW_BASE_URL || ""} onChange={(event) => updateField("SILICONFLOW_BASE_URL", event.target.value)} />
            </FormField>
            <FormField label={labels.model}>
              <input value={form.SILICONFLOW_IMAGE_MODEL || ""} onChange={(event) => updateField("SILICONFLOW_IMAGE_MODEL", event.target.value)} />
            </FormField>
            <FormField label={labels.defaultSize}>
              <select value={form.AI_IMAGE_DEFAULT_SIZE || "1024x1024"} onChange={(event) => updateField("AI_IMAGE_DEFAULT_SIZE", event.target.value)}>
                {(imageGeneration.supportedSizes || ["1024x1024", "1024x1536", "1536x1024"]).map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </FormField>
            <FormField label={labels.defaultQuality}>
              <select value={form.AI_IMAGE_DEFAULT_QUALITY || "auto"} onChange={(event) => updateField("AI_IMAGE_DEFAULT_QUALITY", event.target.value)}>
                {(imageGeneration.supportedQualities || ["auto", "low", "medium", "high"]).map((quality) => <option key={quality} value={quality}>{labels.qualityLabels?.[quality] || quality}</option>)}
              </select>
            </FormField>
            <FormField label={labels.recognitionProvider || labels.provider}>
              <select value={form.AI_SECTION_TEMPLATE_PROVIDER || "openai"} onChange={(event) => updateField("AI_SECTION_TEMPLATE_PROVIDER", event.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="siliconflow">SiliconFlow</option>
              </select>
            </FormField>
            <FormField label={labels.enabled}>
              <select value={form.AI_SECTION_TEMPLATE_ENABLED || "true"} onChange={(event) => updateField("AI_SECTION_TEMPLATE_ENABLED", event.target.value)}>
                <option value="true">{labels.enabledYes}</option>
                <option value="false">{labels.enabledNo}</option>
              </select>
            </FormField>
            <FormField label={labels.visionModel}>
              <input value={form.SILICONFLOW_VISION_MODEL || ""} onChange={(event) => updateField("SILICONFLOW_VISION_MODEL", event.target.value)} />
            </FormField>
            <FormField label={labels.textModel}>
              <input value={form.SILICONFLOW_TEXT_MODEL || ""} onChange={(event) => updateField("SILICONFLOW_TEXT_MODEL", event.target.value)} />
            </FormField>
            <FormField label={labels.timeoutMs}>
              <input inputMode="numeric" value={form.AI_SECTION_TEMPLATE_TIMEOUT_MS || "120000"} onChange={(event) => {
                updateField("AI_SECTION_TEMPLATE_TIMEOUT_MS", event.target.value);
                updateField("SILICONFLOW_TIMEOUT_MS", event.target.value);
              }} />
            </FormField>
            <FormField label={labels.outputFormat}>
              <select value={form.AI_IMAGE_OUTPUT_FORMAT || "webp"} onChange={(event) => updateField("AI_IMAGE_OUTPUT_FORMAT", event.target.value)}>
                {(imageGeneration.supportedOutputFormats || ["png", "jpeg", "webp"]).map((format) => <option key={format} value={format}>{format}</option>)}
              </select>
            </FormField>
          </div>

          <div className="admin-actions-row">
            <button className="button primary" type="submit" disabled={saveState.status === "loading"}>
              <Save size={16} aria-hidden="true" />
              {saveState.status === "loading" ? (labels.saving || "Saving...") : (labels.saveSettings || "Save settings")}
            </button>
          </div>
          {saveState.message ? (
            <p className={`form-message ${saveState.status === "success" ? "success" : "error"}`} role={saveState.status === "error" ? "alert" : "status"}>
              {saveState.message}
            </p>
          ) : null}
        </form>
      </div>

      <aside className="ai-settings-side">
        <article className="admin-panel">
          <ShieldCheck size={22} aria-hidden="true" />
          <h2>{labels.securityTitle}</h2>
          <p>{labels.securityLead}</p>
        </article>
        <article className="admin-panel">
          <Sparkles size={22} aria-hidden="true" />
          <h2>{labels.policyTitle}</h2>
          <ul className="ai-policy-list">
            {labels.policies.map((item) => (
              <li key={item}>
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="admin-panel" id="ai-env-guide">
          {allConfigured ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
          <h2>{labels.envTitle}</h2>
          <p>{labels.envLead}</p>
          <p>{labels.envStorageNote}</p>
          <code translate="no">AI_IMAGE_PROVIDER</code>
          <code translate="no">AI_IMAGE_ENABLED</code>
          <code translate="no">AI_IMAGE_DEFAULT_SIZE</code>
          <code translate="no">AI_IMAGE_DEFAULT_QUALITY</code>
          <code translate="no">AI_IMAGE_OUTPUT_FORMAT</code>
          <code translate="no">AI_SECTION_TEMPLATE_PROVIDER</code>
          <code translate="no">AI_SECTION_TEMPLATE_ENABLED</code>
          <code translate="no">AI_SECTION_TEMPLATE_TIMEOUT_MS</code>
          <code translate="no">AI_SECTION_TEMPLATE_UAT_MODE</code>
          <code translate="no">OPENAI_API_KEY</code>
          <code translate="no">OPENAI_IMAGE_ENABLED</code>
          <code translate="no">OPENAI_IMAGE_MODEL</code>
          <code translate="no">OPENAI_IMAGE_OUTPUT_FORMAT</code>
          <code translate="no">OPENAI_IMAGE_DEFAULT_SIZE</code>
          <code translate="no">OPENAI_IMAGE_DEFAULT_QUALITY</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_ENABLED</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_MODEL</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_TIMEOUT_MS</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_UAT_MODE</code>
          <code translate="no">SILICONFLOW_API_KEY</code>
          <code translate="no">SILICONFLOW_BASE_URL</code>
          <code translate="no">SILICONFLOW_IMAGE_MODEL</code>
          <code translate="no">SILICONFLOW_VISION_MODEL</code>
          <code translate="no">SILICONFLOW_TEXT_MODEL</code>
          <code translate="no">SILICONFLOW_TIMEOUT_MS</code>
        </article>
      </aside>
    </section>
  );
}
