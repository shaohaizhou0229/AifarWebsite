"use client";

import { useState } from "react";

export function AuthForm({ mode, labels, localePath, initialError = "" }) {
  const isRegister = mode === "register";
  const googleUrl = `/api/auth/google/?next=${encodeURIComponent(localePath("/account/"))}`;
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    organization: ""
  });
  const [status, setStatus] = useState(initialError ? { type: "error", message: initialError } : { type: "idle", message: "" });
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
      const response = await fetch(isRegister ? "/api/auth/register/" : "/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || labels.auth.failure);
      }

      if (result.requiresConfirmation) {
        setStatus({
          type: "success",
          message: labels.auth.confirmation
        });
        return;
      }

      window.location.assign(localePath("/account/"));
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell auth-card" onSubmit={handleSubmit}>
      <a className="button secondary oauth-button" href={googleUrl}>
        {labels.auth.continueWithGoogle || "Continue with Google"}
      </a>
      <div className="auth-divider" aria-hidden="true">
        <span>{labels.auth.orEmail || "or"}</span>
      </div>
      {isRegister ? (
        <>
          <div className="field">
            <label htmlFor="displayName">{labels.common.name}</label>
            <input id="displayName" name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="organization">{labels.common.organization}</label>
            <input id="organization" name="organization" value={form.organization} onChange={updateField} autoComplete="organization" />
          </div>
        </>
      ) : null}
      <div className="field">
        <label htmlFor="email">{labels.common.workEmail}</label>
        <input id="email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">{labels.common.password}</label>
        <input id="password" name="password" type="password" value={form.password} onChange={updateField} autoComplete={isRegister ? "new-password" : "current-password"} required />
      </div>
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? labels.common.pleaseWait : isRegister ? labels.auth.createAccount : labels.auth.signIn}
      </button>
      <p className="muted-line">
        {isRegister ? labels.auth.alreadyHaveAccount : labels.auth.needAccount}
        <a href={localePath(isRegister ? "/login/" : "/register/")}>{isRegister ? labels.auth.signIn : labels.auth.register}</a>
      </p>
    </form>
  );
}
