"use client";

import { useState } from "react";

const initialForm = {
  name: "",
  workEmail: "",
  organization: "",
  subject: "",
  requestType: "product_inquiry",
  message: ""
};

const requestTypes = [
  ["product_inquiry", "Product inquiry"],
  ["technical_support", "Technical support"],
  ["partnership", "Partnership"],
  ["other", "Other"]
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form, labels) {
  if (!form.name.trim() || !form.workEmail.trim() || !form.requestType || !form.message.trim()) {
    return labels.validation;
  }

  if (!EMAIL_PATTERN.test(form.workEmail.trim())) {
    return labels.invalidEmail;
  }

  return "";
}

export function ContactForm({ initialData = {}, isLoggedIn = false, labels, locale = "zh-CN" }) {
  const [form, setForm] = useState({
    ...initialForm,
    ...initialData
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateForm(form, labels.contact);

    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          workEmail: form.workEmail,
          organization: form.organization,
          subject: form.subject,
          requestType: form.requestType,
          message: form.message,
          locale
        })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || labels.contact.submitFailed);
      }

      setForm({
        ...initialForm,
        ...initialData,
        subject: "",
        message: ""
      });
      setStatus({
        type: "success",
        message: labels.contact.success
      });
    } catch {
      setStatus({
        type: "error",
        message: labels.contact.error
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="name">{labels.common.name}</label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={updateField}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="workEmail">{labels.common.workEmail}</label>
        <input
          id="workEmail"
          name="workEmail"
          type="email"
          autoComplete="email"
          value={form.workEmail}
          onChange={updateField}
          readOnly={isLoggedIn}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="organization">{labels.common.organization}</label>
        <input
          id="organization"
          name="organization"
          autoComplete="organization"
          value={form.organization}
          onChange={updateField}
        />
      </div>
      <div className="field">
        <label htmlFor="subject">{labels.contact.subject}</label>
        <input
          id="subject"
          name="subject"
          value={form.subject}
          onChange={updateField}
        />
      </div>
      <div className="field">
        <label htmlFor="requestType">{labels.contact.requestType}</label>
        <select
          id="requestType"
          name="requestType"
          value={form.requestType}
          onChange={updateField}
          required
        >
          {requestTypes.map(([value]) => (
            <option key={value} value={value}>
              {labels.contact.requestTypes[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">{labels.contact.message}</label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={updateField}
          required
        />
      </div>
      {status.message ? (
        <p className={`form-message ${status.type}`} role="status">
          {status.message}
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.contact.submitting : labels.contact.submit}
      </button>
    </form>
  );
}
