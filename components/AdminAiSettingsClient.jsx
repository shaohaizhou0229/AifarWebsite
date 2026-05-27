"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck, Sparkles, TestTube2, XCircle } from "lucide-react";

function statusClass(configured) {
  return configured ? "success" : "warning";
}

export function AdminAiSettingsClient({ labels, settings }) {
  const [testState, setTestState] = useState({ status: "idle", message: "", checkedAt: "" });
  const configured = Boolean(settings?.configured);

  async function testConnection() {
    setTestState({ status: "loading", message: labels.testing, checkedAt: "" });
    try {
      const response = await fetch("/api/admin/settings/ai/test/", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || labels.testFailed);
      }
      setTestState({
        status: "success",
        message: labels.testSuccess,
        checkedAt: result.checkedAt || new Date().toISOString()
      });
    } catch (error) {
      setTestState({ status: "error", message: error.message || labels.testFailed, checkedAt: "" });
    }
  }

  return (
    <section className="ai-settings-shell">
      <div className="ai-settings-main">
        <article className="admin-panel ai-service-card">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">{labels.serviceEyebrow}</span>
              <h2>{labels.serviceTitle}</h2>
              <p>{labels.serviceLead}</p>
            </div>
            <span className={`admin-status admin-status-${statusClass(configured)}`}>
              {configured ? labels.configured : labels.notConfigured}
            </span>
          </div>
          <dl className="ai-settings-list">
            <div>
              <dt>{labels.provider}</dt>
              <dd>{settings.provider}</dd>
            </div>
            <div>
              <dt>{labels.apiKey}</dt>
              <dd>{settings.apiKeyPreview || labels.notConfigured}</dd>
            </div>
            <div>
              <dt>{labels.model}</dt>
              <dd>{settings.model || labels.notConfigured}</dd>
            </div>
            <div>
              <dt>{labels.outputFormat}</dt>
              <dd>{settings.outputFormat}</dd>
            </div>
          </dl>
          <div className="admin-actions-row">
            <button className="button primary" type="button" onClick={testConnection} disabled={testState.status === "loading"}>
              <TestTube2 size={16} aria-hidden="true" />
              {testState.status === "loading" ? labels.testing : labels.testConnection}
            </button>
            <a className="button secondary" href="#ai-env-guide">
              <KeyRound size={16} aria-hidden="true" />
              {labels.envGuide}
            </a>
          </div>
          {testState.message ? (
            <p className={`form-message ${testState.status === "success" ? "success" : "error"}`} role="status">
              {testState.message}
            </p>
          ) : null}
        </article>

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
              <input value={settings.enabled ? labels.enabledYes : labels.enabledNo} readOnly />
            </label>
            <label>
              <span>{labels.defaultSize}</span>
              <input value={settings.defaultSize} readOnly />
            </label>
            <label>
              <span>{labels.defaultQuality}</span>
              <input value={labels.qualityLabels?.[settings.defaultQuality] || settings.defaultQuality} readOnly />
            </label>
            <label>
              <span>{labels.defaultOutput}</span>
              <input value={settings.outputFormat} readOnly />
            </label>
          </div>
          <div className="ai-settings-options">
            <strong>{labels.availableSizes}</strong>
            <div>
              {(settings.supportedSizes || []).map((size) => <span key={size}>{size}</span>)}
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
          {configured ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
          <h2>{labels.envTitle}</h2>
          <p>{labels.envLead}</p>
          <p>{labels.envStorageNote}</p>
          <code>OPENAI_API_KEY</code>
          <code>OPENAI_IMAGE_ENABLED</code>
          <code>OPENAI_IMAGE_MODEL</code>
          <code>OPENAI_IMAGE_OUTPUT_FORMAT</code>
          <code>OPENAI_IMAGE_DEFAULT_SIZE</code>
          <code>OPENAI_IMAGE_DEFAULT_QUALITY</code>
        </article>
      </aside>
    </section>
  );
}
