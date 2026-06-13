"use client";

const CACHE_PREFIX = "aifar-admin-dashboard-v5";
const DEFAULT_MAX_AGE_MS = 120 * 1000;
const inFlight = new Map();

function safeRangeDays(value) {
  return Number(value) === 1 ? 1 : 7;
}

function normalizeRanges(trafficRangeDays = 7, downloadRangeDays = 7) {
  if (trafficRangeDays && typeof trafficRangeDays === "object") {
    return {
      trafficRangeDays: safeRangeDays(trafficRangeDays.trafficRangeDays ?? trafficRangeDays.trafficRange ?? trafficRangeDays.rangeDays),
      downloadRangeDays: safeRangeDays(trafficRangeDays.downloadRangeDays ?? trafficRangeDays.downloadRange)
    };
  }

  return {
    trafficRangeDays: safeRangeDays(trafficRangeDays),
    downloadRangeDays: safeRangeDays(downloadRangeDays)
  };
}

export function getAdminDashboardCacheKey(locale, trafficRangeDays, downloadRangeDays) {
  const ranges = normalizeRanges(trafficRangeDays, downloadRangeDays);
  return `${CACHE_PREFIX}:${locale}:${ranges.trafficRangeDays}:${ranges.downloadRangeDays}`;
}

export function readCachedAdminDashboard(locale, trafficRangeDays, downloadRangeDays, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (typeof window === "undefined") return null;
  const ranges = normalizeRanges(trafficRangeDays, downloadRangeDays);
  const nextMaxAgeMs = trafficRangeDays && typeof trafficRangeDays === "object" && typeof downloadRangeDays === "number" && maxAgeMs === DEFAULT_MAX_AGE_MS
    ? downloadRangeDays
    : maxAgeMs;

  try {
    const raw = window.sessionStorage.getItem(getAdminDashboardCacheKey(locale, ranges));
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.dashboard || !payload?.storedAt) return null;
    if (Date.now() - Number(payload.storedAt) > nextMaxAgeMs) return null;
    return payload.dashboard;
  } catch {
    return null;
  }
}

export function writeCachedAdminDashboard(locale, trafficRangeDays, downloadRangeDays, dashboard) {
  const nextDashboard = trafficRangeDays && typeof trafficRangeDays === "object" && dashboard === undefined
    ? downloadRangeDays
    : dashboard;
  if (typeof window === "undefined" || !nextDashboard) return;
  const ranges = normalizeRanges(trafficRangeDays, downloadRangeDays);

  try {
    window.sessionStorage.setItem(
      getAdminDashboardCacheKey(locale, ranges),
      JSON.stringify({ dashboard: nextDashboard, storedAt: Date.now() })
    );
  } catch {
    // Session storage is an experience optimization only; failure should not block the dashboard.
  }
}

export async function loadAdminDashboard(locale, trafficRangeDays, downloadRangeDays, { force = false } = {}) {
  const ranges = normalizeRanges(trafficRangeDays, downloadRangeDays);
  const cacheKey = getAdminDashboardCacheKey(locale, ranges);

  if (!force) {
    const cached = readCachedAdminDashboard(locale, ranges);
    if (cached) return cached;
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const params = new URLSearchParams({
    trafficRange: String(ranges.trafficRangeDays),
    downloadRange: String(ranges.downloadRangeDays)
  });
  const request = fetch(`/api/admin/dashboard/?${params.toString()}`, { cache: "no-store", credentials: "same-origin" })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load dashboard.");
      const dashboard = result.dashboard || null;
      writeCachedAdminDashboard(locale, ranges, dashboard);
      return dashboard;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, request);
  return request;
}
