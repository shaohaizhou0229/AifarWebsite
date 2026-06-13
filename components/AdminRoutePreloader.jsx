"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loadAdminDashboard, readCachedAdminDashboard } from "@/components/admin-dashboard-cache";

const PREFETCH_COOLDOWN_MS = 10 * 1000;
const DASHBOARD_WARM_COOLDOWN_MS = 2 * 60 * 1000;

function normalizePath(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function routeKey(pathname, search = "") {
  return `${normalizePath(pathname)}${search}`;
}

function isAdminHomePath(pathname, locale) {
  return normalizePath(pathname) === `/${locale}/admin/`;
}

function safeRangeDays(value) {
  return Number(value) === 1 ? 1 : 7;
}

function isCoolingDown(map, key, cooldownMs) {
  const now = Date.now();
  const last = map.get(key) || 0;
  if (now - last < cooldownMs) return true;
  map.set(key, now);
  return false;
}

export function AdminRoutePreloader({ locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefetched = useRef(new Set());
  const recentPrefetches = useRef(new Map());
  const dashboardWarmTimes = useRef(new Map());
  const localePrefix = `/${locale}/admin`;

  const warmDashboard = useCallback((trafficRangeDays = 7, downloadRangeDays = 7) => {
    if (typeof window === "undefined") return;
    const ranges = {
      trafficRangeDays: safeRangeDays(trafficRangeDays),
      downloadRangeDays: safeRangeDays(downloadRangeDays)
    };
    const dashboardKey = `${locale}:${ranges.trafficRangeDays}:${ranges.downloadRangeDays}`;
    if (readCachedAdminDashboard(locale, ranges) || isCoolingDown(dashboardWarmTimes.current, dashboardKey, DASHBOARD_WARM_COOLDOWN_MS)) return;

    loadAdminDashboard(locale, ranges).catch(() => {
      window.setTimeout(() => {
        loadAdminDashboard(locale, ranges, undefined, { force: true }).catch(() => {});
      }, 1200);
    });
  }, [locale]);

  const prefetch = useCallback((href) => {
    if (!href || typeof window === "undefined") return;

    let url;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (!normalizePath(url.pathname).startsWith(`${localePrefix}/`)) return;
    if (url.hash && `${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`) return;

    const target = `${url.pathname}${url.search}`;
    const key = routeKey(url.pathname, url.search);
    const currentKey = routeKey(pathname, window.location.search);
    if (currentKey === key || prefetched.current.has(key)) return;
    if (isCoolingDown(recentPrefetches.current, key, PREFETCH_COOLDOWN_MS)) return;

    prefetched.current.add(key);
    if (isAdminHomePath(url.pathname, locale)) {
      const trafficRange = url.searchParams.has("trafficRange")
        ? url.searchParams.get("trafficRange")
        : url.searchParams.get("range");
      warmDashboard(trafficRange, url.searchParams.get("downloadRange"));
    }

    try {
      router.prefetch(target, {
        onInvalidate: () => {
          prefetched.current.delete(key);
        }
      });
    } catch {
      prefetched.current.delete(key);
      recentPrefetches.current.delete(key);
    }
  }, [locale, localePrefix, pathname, router, warmDashboard]);

  useEffect(() => {
    const shell = document.querySelector(".admin-shell");
    if (!shell) return undefined;

    const handleIntent = (event) => {
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor || !shell.contains(anchor)) return;
      prefetch(anchor.getAttribute("href") || anchor.href);
    };

    shell.addEventListener("pointerenter", handleIntent, true);
    shell.addEventListener("focusin", handleIntent);
    shell.addEventListener("mousedown", handleIntent);
    shell.addEventListener("touchstart", handleIntent, { passive: true });

    return () => {
      shell.removeEventListener("pointerenter", handleIntent, true);
      shell.removeEventListener("focusin", handleIntent);
      shell.removeEventListener("mousedown", handleIntent);
      shell.removeEventListener("touchstart", handleIntent);
    };
  }, [prefetch]);

  return null;
}
