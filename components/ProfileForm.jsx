"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, MailCheck, Save, ShieldCheck, Unlink } from "lucide-react";

function Message({ status }) {
  if (!status.message) return null;
  return <p className={`form-message ${status.type}`} role="status">{status.message}</p>;
}

function errorMessage(result, labels, fallback) {
  return labels.errors?.[result.errorCode] || result.error || fallback;
}

export function ProfileForm({ profile, labels, profilePath = "/zh-CN/account/profile/" }) {
  const profileLabels = labels.profile;
  const [form, setForm] = useState({
    displayName: profile?.display_name || "",
    organization: profile?.organization || "",
    jobTitle: profile?.job_title || "",
    countryRegion: profile?.country_region || "",
    phone: profile?.phone || "",
    notificationPreferences: profile?.notificationPreferences || { email: true, inApp: true }
  });
  const [security, setSecurity] = useState({
    email: profile?.email || "",
    pendingEmail: null,
    identities: [],
    providers: [],
    hasEmailIdentity: true,
    hasGoogleIdentity: false,
    canUnlinkGoogle: false
  });
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [profileStatus, setProfileStatus] = useState({ type: "idle", message: "" });
  const [emailStatus, setEmailStatus] = useState({ type: "idle", message: "" });
  const [passwordStatus, setPasswordStatus] = useState({ type: "idle", message: "" });
  const [identityStatus, setIdentityStatus] = useState({ type: "idle", message: "" });
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isGoogleDisconnecting, setIsGoogleDisconnecting] = useState(false);
  const [isSecurityLoading, setIsSecurityLoading] = useState(true);

  async function refreshSecurity() {
    setIsSecurityLoading(true);
    try {
      const response = await fetch("/api/account/security/");
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errorMessage(result, profileLabels, profileLabels.securityLoadFailed));
      }
      setSecurity(result.security);
    } catch (error) {
      setIdentityStatus({ type: "error", message: error.message });
    } finally {
      setIsSecurityLoading(false);
    }
  }

  useEffect(() => {
    refreshSecurity();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateNotificationPreference(event) {
    const { name, checked } = event.target;
    setForm((current) => ({
      ...current,
      notificationPreferences: {
        ...current.notificationPreferences,
        [name]: checked
      }
    }));
  }

  function updatePasswordField(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setIsProfileSubmitting(true);
    setProfileStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/account/profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorMessage(result, profileLabels, profileLabels.failure));
      }

      setProfileStatus({ type: "success", message: profileLabels.success });
    } catch (error) {
      setProfileStatus({ type: "error", message: error.message });
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setIsEmailSubmitting(true);
    setEmailStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/account/security/email/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForm.email, redirectPath: profilePath })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorMessage(result, profileLabels, profileLabels.emailFailure));
      }

      setSecurity(result.security);
      setEmailForm({ email: "" });
      setEmailStatus({ type: "success", message: profileLabels.emailChangeSent });
    } catch (error) {
      setEmailStatus({ type: "error", message: error.message });
    } finally {
      setIsEmailSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setIsPasswordSubmitting(true);
    setPasswordStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/account/security/password/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorMessage(result, profileLabels, profileLabels.passwordFailure));
      }

      setSecurity(result.security);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordStatus({ type: "success", message: profileLabels.passwordUpdated });
    } catch (error) {
      setPasswordStatus({ type: "error", message: error.message });
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  async function handleGoogleDisconnect() {
    if (!window.confirm(profileLabels.googleDisconnectConfirm)) return;
    setIsGoogleDisconnecting(true);
    setIdentityStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/account/security/google/", { method: "DELETE" });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorMessage(result, profileLabels, profileLabels.googleDisconnectFailed));
      }

      setSecurity(result.security);
      setIdentityStatus({ type: "success", message: profileLabels.googleDisconnected });
    } catch (error) {
      setIdentityStatus({ type: "error", message: error.message });
    } finally {
      setIsGoogleDisconnecting(false);
    }
  }

  const requiresCurrentPassword = security.hasEmailIdentity !== false;
  const googleStatus = security.hasGoogleIdentity ? profileLabels.connected : profileLabels.notConnected;
  const googleBlocked = security.hasGoogleIdentity && !security.canUnlinkGoogle;

  return (
    <div className="account-settings-shell">
      <form className="account-settings-panel" onSubmit={handleProfileSubmit}>
        <div className="account-settings-panel-head">
          <div>
            <span className="account-settings-kicker">{profileLabels.profileSectionEyebrow}</span>
            <h2>{profileLabels.profileSectionTitle}</h2>
            <p>{profileLabels.profileSectionLead}</p>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>

        <div className="profile-form-grid">
          <div className="field">
            <label htmlFor="displayName">{labels.common.name}</label>
            <input id="displayName" name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="organization">{labels.common.organization}</label>
            <input id="organization" name="organization" value={form.organization} onChange={updateField} autoComplete="organization" />
          </div>
          <div className="field">
            <label htmlFor="jobTitle">{profileLabels.jobTitle}</label>
            <input id="jobTitle" name="jobTitle" value={form.jobTitle} onChange={updateField} />
          </div>
          <div className="field">
            <label htmlFor="countryRegion">{profileLabels.countryRegion}</label>
            <input id="countryRegion" name="countryRegion" value={form.countryRegion} onChange={updateField} />
          </div>
          <div className="field profile-form-grid-full">
            <label htmlFor="phone">{profileLabels.phone}</label>
            <input id="phone" name="phone" value={form.phone} onChange={updateField} autoComplete="tel" />
          </div>
        </div>

        <fieldset className="field checkbox-grid">
          <legend>{profileLabels.notificationPreferences}</legend>
          <label className="checkbox-line">
            <input
              type="checkbox"
              name="email"
              checked={form.notificationPreferences.email}
              onChange={updateNotificationPreference}
            />
            <span>{profileLabels.emailNotifications}</span>
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              name="inApp"
              checked={form.notificationPreferences.inApp}
              onChange={updateNotificationPreference}
            />
            <span>{profileLabels.inAppNotifications}</span>
          </label>
        </fieldset>

        <Message status={profileStatus} />
        <button className="button primary account-settings-action" type="submit" disabled={isProfileSubmitting}>
          <Save size={18} aria-hidden="true" />
          {isProfileSubmitting ? profileLabels.saving : profileLabels.save}
        </button>
      </form>

      <form className="account-settings-panel" onSubmit={handleEmailSubmit}>
        <div className="account-settings-panel-head">
          <div>
            <span className="account-settings-kicker">{profileLabels.emailSectionEyebrow}</span>
            <h2>{profileLabels.emailSectionTitle}</h2>
            <p>{profileLabels.emailSectionLead}</p>
          </div>
          <MailCheck aria-hidden="true" />
        </div>

        <div className="account-email-current">
          <span>{profileLabels.currentEmail}</span>
          <strong>{security.email || profile?.email || "-"}</strong>
          {security.pendingEmail ? (
            <small>{profileLabels.pendingEmail}: {security.pendingEmail}</small>
          ) : null}
        </div>

        <div className="account-security-row">
          <div className="field">
            <label htmlFor="newAccountEmail">{profileLabels.newEmail}</label>
            <input
              id="newAccountEmail"
              name="email"
              type="email"
              value={emailForm.email}
              onChange={(event) => setEmailForm({ email: event.target.value })}
              autoComplete="email"
              required
            />
          </div>
          <button className="button secondary account-settings-inline-action" type="submit" disabled={isEmailSubmitting}>
            {isEmailSubmitting ? profileLabels.changingEmail : profileLabels.changeEmail}
          </button>
        </div>

        <Message status={emailStatus} />
      </form>

      <section className="account-settings-panel">
        <div className="account-settings-panel-head">
          <div>
            <span className="account-settings-kicker">{profileLabels.connectedAccountsEyebrow}</span>
            <h2>{profileLabels.connectedAccountsTitle}</h2>
            <p>{profileLabels.connectedAccountsLead}</p>
          </div>
          <Unlink aria-hidden="true" />
        </div>

        <div className="connected-account-row">
          <div className="connected-account-brand" aria-hidden="true">G</div>
          <div>
            <strong>{profileLabels.google}</strong>
            <span>{isSecurityLoading ? profileLabels.loadingSecurity : googleStatus}</span>
          </div>
          <button
            className="button danger compact"
            type="button"
            disabled={!security.hasGoogleIdentity || !security.canUnlinkGoogle || isGoogleDisconnecting}
            onClick={handleGoogleDisconnect}
          >
            {isGoogleDisconnecting ? profileLabels.disconnectingGoogle : profileLabels.disconnectGoogle}
          </button>
        </div>
        {googleBlocked ? <p className="muted-line">{profileLabels.googleDisconnectBlocked}</p> : null}
        <Message status={identityStatus} />
      </section>

      <form className="account-settings-panel" onSubmit={handlePasswordSubmit}>
        <div className="account-settings-panel-head">
          <div>
            <span className="account-settings-kicker">{profileLabels.passwordSectionEyebrow}</span>
            <h2>{profileLabels.passwordSectionTitle}</h2>
            <p>{requiresCurrentPassword ? profileLabels.passwordSectionLead : profileLabels.setPasswordLead}</p>
          </div>
          <LockKeyhole aria-hidden="true" />
        </div>

        <div className="profile-form-grid">
          {requiresCurrentPassword ? (
            <div className="field profile-form-grid-full">
              <label htmlFor="currentPassword">{profileLabels.currentPassword}</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={updatePasswordField}
                autoComplete="current-password"
                required
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="newPassword">{profileLabels.newPassword}</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={updatePasswordField}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">{profileLabels.confirmPassword}</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={updatePasswordField}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <Message status={passwordStatus} />
        <button className="button primary account-settings-action" type="submit" disabled={isPasswordSubmitting}>
          <LockKeyhole size={18} aria-hidden="true" />
          {isPasswordSubmitting
            ? profileLabels.updatingPassword
            : requiresCurrentPassword
              ? profileLabels.changePassword
              : profileLabels.setPassword}
        </button>
      </form>
    </div>
  );
}
