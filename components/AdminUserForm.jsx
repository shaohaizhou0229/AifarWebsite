"use client";

import { useState } from "react";

export function AdminUserForm({ user, labels }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    organization: user?.organization || "",
    jobTitle: user?.jobTitle || "",
    countryRegion: user?.countryRegion || "",
    phone: user?.phone || "",
    role: user?.role || "user"
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
      const response = await fetch(`/api/admin/users/${user.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.saveFailed);
      }

      setStatus({ type: "success", message: labels.saved });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <div className="field">
        <label>{labels.email}</label>
        <input value={user.email || ""} disabled readOnly />
      </div>
      <div className="field">
        <label htmlFor="displayName">{labels.name}</label>
        <input id="displayName" name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="organization">{labels.organization}</label>
        <input id="organization" name="organization" value={form.organization} onChange={updateField} autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="jobTitle">{labels.jobTitle}</label>
        <input id="jobTitle" name="jobTitle" value={form.jobTitle} onChange={updateField} />
      </div>
      <div className="field">
        <label htmlFor="countryRegion">{labels.countryRegion}</label>
        <input id="countryRegion" name="countryRegion" value={form.countryRegion} onChange={updateField} />
      </div>
      <div className="field">
        <label htmlFor="phone">{labels.phone}</label>
        <input id="phone" name="phone" value={form.phone} onChange={updateField} autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="role">{labels.role}</label>
        <select id="role" name="role" value={form.role} onChange={updateField}>
          <option value="user">{labels.roles.user}</option>
          <option value="admin">{labels.roles.admin}</option>
        </select>
      </div>
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.saving : labels.save}
      </button>
    </form>
  );
}
