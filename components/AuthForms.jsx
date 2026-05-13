"use client";

import { useState } from "react";

export function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    organization: ""
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
      const response = await fetch(isRegister ? "/api/auth/register/" : "/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Authentication failed.");
      }

      if (result.requiresConfirmation) {
        setStatus({
          type: "success",
          message: "Please check your email to confirm your account before signing in."
        });
        return;
      }

      window.location.assign("/account/");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-shell auth-card" onSubmit={handleSubmit}>
      {isRegister ? (
        <>
          <div className="field">
            <label htmlFor="displayName">Name</label>
            <input id="displayName" name="displayName" value={form.displayName} onChange={updateField} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="organization">Organization</label>
            <input id="organization" name="organization" value={form.organization} onChange={updateField} autoComplete="organization" />
          </div>
        </>
      ) : null}
      <div className="field">
        <label htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={updateField} autoComplete={isRegister ? "new-password" : "current-password"} required />
      </div>
      {status.message ? <p className={`form-message ${status.type}`} role="status">{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
      </button>
      <p className="muted-line">
        {isRegister ? "Already have an account? " : "Need an account? "}
        <a href={isRegister ? "/login/" : "/register/"}>{isRegister ? "Sign in" : "Register"}</a>
      </p>
    </form>
  );
}
