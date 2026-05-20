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

export function AdminNav({ locale, labels = {}, current = "home", variant = "inline" }) {
  return (
    <nav className={`admin-nav admin-nav-${variant}`} aria-label={labels.label || "Admin sections"}>
      {ADMIN_GROUPS.map(([groupKey, itemKeys]) => (
        <div className="admin-nav-group" key={groupKey}>
          <span className="admin-nav-group-label">{labels.groups?.[groupKey] || FALLBACK_GROUP_LABELS[groupKey]}</span>
          {itemKeys.map((key) => {
            const Icon = ADMIN_ICONS[key];
            const href = ADMIN_ITEMS[key];
            return (
              <a
                key={key}
                className={current === key ? "active" : ""}
                href={localizedPath(locale, href)}
                aria-current={current === key ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>{labels[key] || FALLBACK_LABELS[key]}</span>
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

