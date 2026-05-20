"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { locales } from "@/i18n/routing";

const PRIVATE_SECTIONS = new Set(["admin", "account", "login", "register"]);

function getPublicPath(pathname = "") {
  const parts = pathname.split("/").filter(Boolean);
  const locale = locales.includes(parts[0]) ? parts[0] : "";
  const section = locale ? parts[1] : parts[0];

  if (!pathname || PRIVATE_SECTIONS.has(section)) return null;
  if (section === "_next" || section === "api") return null;

  const stripped = locale ? `/${parts.slice(1).join("/")}` : pathname;
  return {
    locale,
    path: stripped === "/" || stripped === "" ? "/" : `${stripped.replace(/\/$/, "")}/`
  };
}

export function SiteAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = getPublicPath(pathname);
    if (!payload) return;

    const body = JSON.stringify({ ...payload, eventType: "page_view" });
    const blob = new Blob([body], { type: "application/json" });

    if (navigator.sendBeacon && navigator.sendBeacon("/api/analytics/track/", blob)) {
      return;
    }

    fetch("/api/analytics/track/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
