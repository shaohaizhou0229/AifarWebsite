import { AdminStatusPill } from "@/components/AdminStatusPill";
import { localizedPath } from "@/i18n/routing";

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function resolveHref(locale, href) {
  if (!href || href === "#") {
    return "#";
  }

  return href.startsWith("/admin") ? localizedPath(locale, href) : href;
}

export function AdminHealthList({ items = [], labels = {}, locale }) {
  return (
    <div className="admin-health-list">
      {items.map((item) => (
        <a className="admin-health-row" href={resolveHref(locale, item.href)} key={item.key}>
          <div>
            <strong>{item.label}</strong>
            <p>{item.summary}</p>
          </div>
          <span>{item.count}</span>
          <AdminStatusPill tone={item.tone}>{item.status}</AdminStatusPill>
          <time>{formatDate(item.updatedAt, locale) || labels.notAvailable}</time>
          <small>{labels.open || "Open"}</small>
        </a>
      ))}
    </div>
  );
}
