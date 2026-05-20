"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loadAdminDashboard } from "@/components/admin-dashboard-cache";
import { localizedPath } from "@/i18n/routing";

const PRIMARY_ADMIN_PATHS = [
  "/admin/",
  "/admin/product/",
  "/admin/downloads/",
  "/admin/users/",
  "/admin/docs/",
  "/admin/support/",
  "/admin/contact/",
  "/admin/collaboration/"
];

function normalizePath(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function routeKey(pathname, search = "") {
  return `${normalizePath(pathname)}${search}`;
}

function isAdminHomePath(pathname, locale) {
  return normalizePath(pathname) === `/${locale}/admin/`;
}

function idle(callback) {
  if (typeof window === "undefined") return null;
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 1800 });
  }
  return window.setTimeout(callback, 300);
}

function cancelIdle(id) {
  if (id == null || typeof window === "undefined") return;
  if ("cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
    return;
  }
  window.clearTimeout(id);
}

export function AdminRoutePreloader({ locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefetched = useRef(new Set());
  const localePrefix = `/${locale}/admin`;
  const primaryRoutes = useMemo(() => PRIMARY_ADMIN_PATHS.map((path) => localizedPath(locale, path)), [locale]);

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

    prefetched.current.add(key);
    if (isAdminHomePath(url.pathname, locale)) {
      loadAdminDashboard(locale, Number(url.searchParams.get("range") || 7)).catch(() => {});
    }

    try {
      router.prefetch(target, {
        onInvalidate: () => {
          prefetched.current.delete(key);
        }
      });
    } catch {
      prefetched.current.delete(key);
    }
  }, [locale, localePrefix, pathname, router]);

  useEffect(() => {
    const timers = [];
    const idleId = idle(() => {
      primaryRoutes.forEach((href, index) => {
        const timer = window.setTimeout(() => prefetch(href), index * 140);
        timers.push(timer);
      });
      if (!isAdminHomePath(pathname, locale)) {
        const dashboardTimer = window.setTimeout(() => {
          loadAdminDashboard(locale, 7).catch(() => {});
        }, primaryRoutes.length * 140 + 180);
        timers.push(dashboardTimer);
      }
    });

    return () => {
      cancelIdle(idleId);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [prefetch, primaryRoutes]);

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
