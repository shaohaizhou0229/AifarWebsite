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
  Image as ImageIcon,
  LifeBuoy,
  Mail,
  Settings,
  Users,
  Workflow
} from "lucide-react";

const ADMIN_ITEMS = {
  home: "/admin/",
  product: "/admin/product/",
  assets: "/admin/assets/",
  downloads: "/admin/downloads/",
  users: "/admin/users/",
  docs: "/admin/docs/",
  support: "/admin/support/",
  contact: "/admin/contact/",
  collaboration: "/admin/collaboration/",
  aiSettings: "/admin/settings/ai/"
};

const ADMIN_GROUPS = [
  ["workspace", ["home", "product", "assets", "downloads", "users", "docs"]],
  ["operations", ["support", "contact", "collaboration"]],
  ["system", ["aiSettings"]]
];

const FALLBACK_LABELS = {
  home: "Admin home",
  product: "Product",
  assets: "Image assets",
  downloads: "Downloads",
  users: "Users",
  docs: "Docs",
  support: "Support",
  contact: "Contact",
  collaboration: "Collaboration",
  aiSettings: "AI service"
};

const FALLBACK_GROUP_LABELS = {
  workspace: "Workspace",
  operations: "Operations",
  system: "System"
};

const ADMIN_ICONS = {
  home: Home,
  product: Box,
  assets: ImageIcon,
  downloads: Download,
  users: Users,
  docs: FileText,
  support: LifeBuoy,
  contact: Mail,
  collaboration: Workflow,
  aiSettings: Settings
};

const ADMIN_PERMISSION_BY_KEY = {
  product: "admin.product",
  assets: "admin.assets",
  downloads: "admin.downloads",
  users: "admin.users",
  docs: "admin.docs",
  support: "admin.support",
  contact: "admin.contact",
  collaboration: "admin.collaboration",
  aiSettings: "admin.settings"
};

function canSeeItem(key, permissions = []) {
  const permission = ADMIN_PERMISSION_BY_KEY[key];
  return !permission || permissions.includes(permission);
}

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

export function AdminNav({ locale, labels = {}, current = "", variant = "inline", permissions = [] }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState("");
  const activePath = useMemo(() => stripLocale(pathname, locale), [pathname, locale]);

  useEffect(() => {
    setPendingHref("");
  }, [pathname]);

  return (
    <nav className={`admin-nav admin-nav-${variant}`} aria-label={labels.label || "Admin sections"}>
      {ADMIN_GROUPS.map(([groupKey, itemKeys]) => {
        const visibleItemKeys = itemKeys.filter((key) => canSeeItem(key, permissions));
        if (!visibleItemKeys.length) return null;
        return (
          <div className="admin-nav-group" key={groupKey}>
            <span className="admin-nav-group-label">{labels.groups?.[groupKey] || FALLBACK_GROUP_LABELS[groupKey]}</span>
            {visibleItemKeys.map((key) => {
              const Icon = ADMIN_ICONS[key];
              const href = ADMIN_ITEMS[key];
              const localizedHref = localizedPath(locale, href);
              const normalizedHref = normalizePath(href);
              const isActive = (current && current === key) || (key === "home" ? activePath === normalizedHref : activePath.startsWith(normalizedHref));
              const isPending = pendingHref === localizedHref;
              const markPending = () => {
                if (!isActive) setPendingHref(localizedHref);
              };
              return (
                <Link
                  key={key}
                  className={[isActive ? "active" : "", isPending ? "pending" : ""].filter(Boolean).join(" ")}
                  href={localizedHref}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  aria-busy={isPending ? "true" : undefined}
                  data-pending={isPending ? "true" : undefined}
                  onPointerDown={markPending}
                  onClick={markPending}
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                  <span>{labels[key] || FALLBACK_LABELS[key]}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
