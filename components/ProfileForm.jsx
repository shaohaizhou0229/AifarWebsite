"use client";

import { useState } from "react";

export function ProfileForm({ profile, labels }) {
  const [form, setForm] = useState({
    displayName: profile?.display_name || "",
    organization: profile?.organization || "",
    jobTitle: profile?.job_title || "",
    countryRegion: profile?.country_region || "",
    phone: profile?.phone || ""
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/account/profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.profile.failure);
      }

      setStatus({ type: "success", message: labels.profile.success });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <div className="field">
        <label>{labels.common.email}</label>
        <input value={profile?.email || ""} disabled readOnly />
      </div>
      <div className="field">
        <label htmlFor="displayName">{labels.common.name}</label>
        <input id="displayName" name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="organization">{labels.common.organization}</label>
        <input id="organization" name="organization" value={form.organization} onChange={updateField} autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="jobTitle">{labels.profile.jobTitle}</label>
        <input id="jobTitle" name="jobTitle" value={form.jobTitle} onChange={updateField} />
      </div>
      <div className="field">
        <label htmlFor="countryRegion">{labels.profile.countryRegion}</label>
        <input id="countryRegion" name="countryRegion" value={form.countryRegion} onChange={updateField} />
      </div>
      <div className="field">
        <label htmlFor="phone">{labels.profile.phone}</label>
        <input id="phone" name="phone" value={form.phone} onChange={updateField} autoComplete="tel" />
      </div>
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.profile.saving : labels.profile.save}
      </button>
    </form>
  );
}
