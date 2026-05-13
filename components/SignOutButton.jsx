"use client";

import { useState } from "react";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout/", { method: "POST" }).catch(() => {});
    window.location.assign("/");
  }

  return (
    <button className="nav-action" type="button" onClick={signOut} disabled={isSigningOut}>
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
