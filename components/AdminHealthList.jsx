import Link from "next/link";
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
    <div className="admin-health-table">
      <div className="admin-health-head">
        <span>{labels.module || "Module"}</span>
        <span>{labels.status || "Status"}</span>
        <span>{labels.keyData || "Key data"}</span>
        <span>{labels.lastUpdated || "Last updated"}</span>
        <span>{labels.action || "Action"}</span>
      </div>
      {items.map((item) => (
        <Link className="admin-health-row" href={resolveHref(locale, item.href)} key={item.key}>
          <div>
            <strong>{item.label}</strong>
            <p>{item.summary}</p>
          </div>
          <AdminStatusPill tone={item.tone}>{item.status}</AdminStatusPill>
          <span>{item.count}</span>
          <time>{formatDate(item.updatedAt, locale) || labels.notAvailable}</time>
          <small>{labels.open || "Open"}</small>
        </Link>
      ))}
    </div>
  );
}
