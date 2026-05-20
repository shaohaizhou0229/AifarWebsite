"use client";

import { useState } from "react";
import { clearSiteSessionCache } from "@/components/site-session-cache";

export function SignOutButton({ labels, redirectTo = "/" }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    clearSiteSessionCache();
    await fetch("/api/auth/logout/", { method: "POST" }).catch(() => {});
    window.location.assign(redirectTo);
  }

  return (
    <button className="nav-action" type="button" onClick={signOut} disabled={isSigningOut}>
      {isSigningOut ? labels.signingOut : labels.signOut}
    </button>
  );
}
