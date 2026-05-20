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

export function AdminActivityFeed({ items = [], emptyText, locale }) {
  if (!items.length) {
    return <p className="admin-empty-copy">{emptyText}</p>;
  }

  return (
    <div className="admin-activity-feed">
      {items.map((item) => (
        <a className="admin-activity-item" href={resolveHref(locale, item.href)} key={item.id}>
          <span className="admin-activity-dot" />
          <div>
            <strong>{item.title}</strong>
            {item.meta ? <p>{item.meta}</p> : null}
          </div>
          <time>{formatDate(item.createdAt, locale)}</time>
        </a>
      ))}
    </div>
  );
}
