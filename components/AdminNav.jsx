import { localizedPath } from "@/i18n/routing";

const ADMIN_ITEMS = [
  ["home", "/admin/"],
  ["product", "/admin/product/"],
  ["downloads", "/admin/downloads/"],
  ["users", "/admin/users/"],
  ["docs", "/admin/docs/"],
  ["support", "/admin/support/"],
  ["contact", "/admin/contact/"],
  ["collaboration", "/admin/collaboration/"]
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

export function AdminNav({ locale, labels = {}, current = "home" }) {
  return (
    <div className="admin-nav" aria-label={labels.label || "Admin sections"}>
      {ADMIN_ITEMS.map(([key, href]) => (
        <a
          key={key}
          className={current === key ? "active" : ""}
          href={localizedPath(locale, href)}
          aria-current={current === key ? "page" : undefined}
        >
          {labels[key] || FALLBACK_LABELS[key]}
        </a>
      ))}
    </div>
  );
}

