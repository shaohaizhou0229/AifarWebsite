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

function validateForm(form) {
  if (!form.name.trim() || !form.workEmail.trim() || !form.requestType || !form.message.trim()) {
    return "Please fill in your name, work email, request type, and message.";
  }

  if (!EMAIL_PATTERN.test(form.workEmail.trim())) {
    return "Please enter a valid work email.";
  }

  return "";
}

export function ContactForm({ initialData = {}, isLoggedIn = false }) {
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

    const validationMessage = validateForm(form);

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
          message: form.message
        })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Submit failed");
      }

      setForm({
        ...initialForm,
        ...initialData,
        subject: "",
        message: ""
      });
      setStatus({
        type: "success",
        message: "Your request has been submitted. The Aifar team will follow up soon."
      });
    } catch {
      setStatus({
        type: "error",
        message: "We could not submit your request right now. Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="name">Name</label>
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
        <label htmlFor="workEmail">Work email</label>
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
        <label htmlFor="organization">Organization</label>
        <input
          id="organization"
          name="organization"
          autoComplete="organization"
          value={form.organization}
          onChange={updateField}
        />
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          name="subject"
          value={form.subject}
          onChange={updateField}
        />
      </div>
      <div className="field">
        <label htmlFor="requestType">Request type</label>
        <select
          id="requestType"
          name="requestType"
          value={form.requestType}
          onChange={updateField}
          required
        >
          {requestTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
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
        {isSubmitting ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
