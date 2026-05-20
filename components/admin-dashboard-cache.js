"use client";

const CACHE_PREFIX = "aifar-admin-dashboard-v2";
const DEFAULT_MAX_AGE_MS = 120 * 1000;
const inFlight = new Map();

function safeRangeDays(value) {
  const days = Number(value);
  return [1, 7, 30].includes(days) ? days : 7;
}

export function getAdminDashboardCacheKey(locale, rangeDays) {
  return `${CACHE_PREFIX}:${locale}:${safeRangeDays(rangeDays)}`;
}

export function readCachedAdminDashboard(locale, rangeDays, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getAdminDashboardCacheKey(locale, rangeDays));
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.dashboard || !payload?.storedAt) return null;
    if (Date.now() - Number(payload.storedAt) > maxAgeMs) return null;
    return payload.dashboard;
  } catch {
    return null;
  }
}

export function writeCachedAdminDashboard(locale, rangeDays, dashboard) {
  if (typeof window === "undefined" || !dashboard) return;

  try {
    window.sessionStorage.setItem(
      getAdminDashboardCacheKey(locale, rangeDays),
      JSON.stringify({ dashboard, storedAt: Date.now() })
    );
  } catch {
    // Session storage is an experience optimization only; failure should not block the dashboard.
  }
}

export async function loadAdminDashboard(locale, rangeDays, { force = false } = {}) {
  const safeRange = safeRangeDays(rangeDays);
  const cacheKey = getAdminDashboardCacheKey(locale, safeRange);

  if (!force) {
    const cached = readCachedAdminDashboard(locale, safeRange);
    if (cached) return cached;
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const request = fetch(`/api/admin/dashboard/?range=${safeRange}`, { cache: "no-store", credentials: "same-origin" })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load dashboard.");
      const dashboard = result.dashboard || null;
      writeCachedAdminDashboard(locale, safeRange, dashboard);
      return dashboard;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);
  return request;
}
