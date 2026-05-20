"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { localizedPath } from "@/i18n/routing";
import {
  Box,
  Download,
  FileText,
  Home,
  LifeBuoy,
  Mail,
  Users,
  Workflow
} from "lucide-react";

const ADMIN_ITEMS = {
  home: "/admin/",
  product: "/admin/product/",
  downloads: "/admin/downloads/",
  users: "/admin/users/",
  docs: "/admin/docs/",
  support: "/admin/support/",
  contact: "/admin/contact/",
  collaboration: "/admin/collaboration/"
};

const ADMIN_GROUPS = [
  ["workspace", ["home", "product", "downloads", "users", "docs"]],
  ["operations", ["support", "contact", "collaboration"]]
];

const FALLBACK_LABELS = {
  home: "Admin home",
  product: "Product",
  downloads: "Downloads",
  users: "Users",
  docs: "Docs",
  support: "Support",
  contact: "Contact",
  collaboration: "Collaboration"
};

const FALLBACK_GROUP_LABELS = {
  workspace: "Workspace",
  operations: "Operations"
};

const ADMIN_ICONS = {
  home: Home,
  product: Box,
  downloads: Download,
  users: Users,
  docs: FileText,
  support: LifeBuoy,
  contact: Mail,
  collaboration: Workflow
};

function normalizePath(value) {
  if (!value) return "/";
  return value.endsWith("/") ? value : `${value}/`;
}

function stripLocale(pathname, locale) {
  const normalized = normalizePath(pathname);
  const prefix = `/${locale}/`;
  if (normalized === prefix) return "/";
  if (normalized.startsWith(prefix)) return normalizePath(`/${normalized.slice(prefix.length)}`);
  return normalized;
}

export function AdminNav({ locale, labels = {}, current = "", variant = "inline" }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState("");
  const activePath = useMemo(() => stripLocale(pathname, locale), [pathname, locale]);

  useEffect(() => {
    setPendingHref("");
  }, [pathname]);

  return (
    <nav className={`admin-nav admin-nav-${variant}`} aria-label={labels.label || "Admin sections"}>
      {ADMIN_GROUPS.map(([groupKey, itemKeys]) => (
        <div className="admin-nav-group" key={groupKey}>
          <span className="admin-nav-group-label">{labels.groups?.[groupKey] || FALLBACK_GROUP_LABELS[groupKey]}</span>
          {itemKeys.map((key) => {
            const Icon = ADMIN_ICONS[key];
            const href = ADMIN_ITEMS[key];
            const localizedHref = localizedPath(locale, href);
            const normalizedHref = normalizePath(href);
            const isActive = (current && current === key) || (key === "home" ? activePath === normalizedHref : activePath.startsWith(normalizedHref));
            const isPending = pendingHref === localizedHref;
            return (
              <Link
                key={key}
                className={`${isActive ? "active" : ""}${isPending ? " pending" : ""}`}
                href={localizedHref}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setPendingHref(localizedHref)}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>{labels[key] || FALLBACK_LABELS[key]}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

