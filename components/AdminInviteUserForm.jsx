"use client";

import { useState } from "react";

export function AdminInviteUserForm({ labels }) {
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    organization: "",
    jobTitle: "",
    countryRegion: "",
    phone: "",
    role: "user",
    adminPermissions: []
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updatePermission(event) {
    const { value, checked } = event.target;
    setForm((current) => ({
      ...current,
      adminPermissions: checked
        ? [...current.adminPermissions, value]
        : current.adminPermissions.filter((permission) => permission !== value)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/admin/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.failed);
      }

      setStatus({ type: "success", message: labels.created });
      setForm({
        email: "",
        displayName: "",
        organization: "",
        jobTitle: "",
        countryRegion: "",
        phone: "",
        role: "user",
        adminPermissions: []
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell" onSubmit={handleSubmit}>
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="inviteEmail">{labels.email}</label>
          <input id="inviteEmail" name="email" type="email" value={form.email} onChange={updateField} required />
        </div>
        <div className="field">
          <label htmlFor="inviteName">{labels.name}</label>
          <input id="inviteName" name="displayName" value={form.displayName} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="inviteOrganization">{labels.organization}</label>
          <input id="inviteOrganization" name="organization" value={form.organization} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="inviteJobTitle">{labels.jobTitle}</label>
          <input id="inviteJobTitle" name="jobTitle" value={form.jobTitle} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="inviteCountryRegion">{labels.countryRegion}</label>
          <input id="inviteCountryRegion" name="countryRegion" value={form.countryRegion} onChange={updateField} />
        </div>
        <div className="field">
          <label htmlFor="invitePhone">{labels.phone}</label>
          <input id="invitePhone" name="phone" value={form.phone} onChange={updateField} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="inviteRole">{labels.role}</label>
        <select id="inviteRole" name="role" value={form.role} onChange={updateField}>
          <option value="user">{labels.roles.user}</option>
          <option value="admin">{labels.roles.admin}</option>
        </select>
      </div>
      {form.role === "admin" ? (
        <fieldset className="field checkbox-grid">
          <legend>{labels.permissionsTitle}</legend>
          {Object.entries(labels.permissions).map(([permission, label]) => (
            <label className="checkbox-line" key={permission}>
              <input
                type="checkbox"
                value={permission}
                checked={form.adminPermissions.includes(permission)}
                onChange={updatePermission}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.creating : labels.create}
      </button>
    </form>
  );
}
