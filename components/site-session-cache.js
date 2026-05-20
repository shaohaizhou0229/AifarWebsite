"use client";

const SITE_SESSION_KEY = "aifar-site-session-v1";
const SITE_SESSION_MAX_AGE_MS = 30 * 60 * 1000;

function isProfileActive(profile) {
  return !profile || !profile.accountStatus || profile.accountStatus === "active";
}

function pickUser(user) {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email || ""
  };
}

function pickProfile(profile) {
  if (!profile) return null;
  return {
    role: profile.role || "user",
    accountStatus: profile.accountStatus || profile.account_status || "active"
  };
}

export function createSiteSession(payload = {}) {
  const user = pickUser(payload.user);
  const profile = pickProfile(payload.profile);
  if (!user || !isProfileActive(profile)) return null;

  return {
    user,
    profile,
    unreadCount: Number(payload.unreadCount || 0)
  };
}

export function readSiteSessionCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SITE_SESSION_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.session || Date.now() - Number(payload.storedAt || 0) > SITE_SESSION_MAX_AGE_MS) return null;
    return payload.session;
  } catch {
    return null;
  }
}

export function writeSiteSessionCache(session) {
  if (typeof window === "undefined") return;
  if (!session?.user) return;

  try {
    window.sessionStorage.setItem(SITE_SESSION_KEY, JSON.stringify({ session, storedAt: Date.now() }));
  } catch {
    // Header session cache is only a rendering hint.
  }
}

export function clearSiteSessionCache() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(SITE_SESSION_KEY);
  } catch {
    // Ignore storage failures during sign-out.
  }
}
