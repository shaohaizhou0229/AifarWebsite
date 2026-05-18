"use client";

import { useState } from "react";

export function AdminUserForm({ user, labels }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    organization: user?.organization || "",
    jobTitle: user?.jobTitle || "",
    countryRegion: user?.countryRegion || "",
    phone: user?.phone || "",
    role: user?.role || "user",
    accountStatus: user?.accountStatus || "active",
    adminPermissions: user?.adminPermissions || []
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function handleDelete() {
    if (!window.confirm(labels.deleteConfirm)) return;
    setIsDeleting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch(`/api/admin/users/${user.id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: labels.deletedByAdmin })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.deleteFailed);
      }

      setForm((current) => ({ ...current, accountStatus: "deleted" }));
      setStatus({ type: "success", message: labels.deleted });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsDeleting(false);
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
      <div className="field">
        <label htmlFor="accountStatus">{labels.accountStatus}</label>
        <select id="accountStatus" name="accountStatus" value={form.accountStatus} onChange={updateField}>
          <option value="active">{labels.statuses.active}</option>
          <option value="deactivated">{labels.statuses.deactivated}</option>
          <option value="deleted">{labels.statuses.deleted}</option>
        </select>
      </div>
      {form.role === "admin" ? (
        <fieldset className="field checkbox-grid">
          <legend>{labels.permissionsTitle}</legend>
          {Object.entries(labels.permissions).map(([key, label]) => {
            const permission = `admin.${key}`;
            return (
            <label className="checkbox-line" key={key}>
              <input
                type="checkbox"
                value={permission}
                checked={form.adminPermissions.includes(permission)}
                onChange={updatePermission}
              />
              <span>{label}</span>
            </label>
          );})}
        </fieldset>
      ) : null}
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <div className="actions">
        <button className="button primary" type="submit" disabled={isSubmitting || isDeleting}>
          {isSubmitting ? labels.saving : labels.save}
        </button>
        <button className="button danger" type="button" disabled={isSubmitting || isDeleting || form.accountStatus === "deleted"} onClick={handleDelete}>
          {isDeleting ? labels.deleting : labels.delete}
        </button>
      </div>
    </form>
  );
}
