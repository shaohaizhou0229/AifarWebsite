"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck, Sparkles, TestTube2, XCircle } from "lucide-react";

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

function resolveTestMessage(labels, result, fallback) {
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

export function AdminAiSettingsClient({ labels, settings }) {
  const imageGeneration = settings?.imageGeneration || settings || {};
  const sectionTemplateRecognition = settings?.sectionTemplateRecognition || {};
  const [testStates, setTestStates] = useState({
    [TEST_TARGETS.imageGeneration]: IDLE_TEST_STATE,
    [TEST_TARGETS.sectionTemplateRecognition]: IDLE_TEST_STATE
  });
  const allConfigured = Boolean(imageGeneration?.configured && sectionTemplateRecognition?.configured);

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
    { label: labels.enabled, value: enabledLabel(labels, imageGeneration.enabled) },
    { label: labels.apiKey, value: imageGeneration.apiKeyPreview || labels.notConfigured },
    { label: labels.model, value: imageGeneration.model || labels.notConfigured },
    { label: labels.outputFormat, value: imageGeneration.outputFormat }
  ];
  const recognitionFields = [
    { label: labels.provider, value: sectionTemplateRecognition.provider },
    { label: labels.enabled, value: enabledLabel(labels, sectionTemplateRecognition.enabled) },
    { label: labels.apiKey, value: sectionTemplateRecognition.apiKeyPreview || labels.notConfigured },
    { label: labels.model, value: sectionTemplateRecognition.model || labels.notConfigured },
    { label: labels.timeoutMs, value: formatTimeout(labels, sectionTemplateRecognition.timeoutMs) }
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
          <code translate="no">OPENAI_API_KEY</code>
          <code translate="no">OPENAI_IMAGE_ENABLED</code>
          <code translate="no">OPENAI_IMAGE_MODEL</code>
          <code translate="no">OPENAI_IMAGE_OUTPUT_FORMAT</code>
          <code translate="no">OPENAI_IMAGE_DEFAULT_SIZE</code>
          <code translate="no">OPENAI_IMAGE_DEFAULT_QUALITY</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_ENABLED</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_MODEL</code>
          <code translate="no">OPENAI_SECTION_TEMPLATE_TIMEOUT_MS</code>
        </article>
      </aside>
    </section>
  );
}
