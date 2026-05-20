import Link from "next/link";
import { localizedPath } from "@/i18n/routing";
import {
  Download,
  FileText,
  LifeBuoy,
  Mail,
  UserRound,
  Workflow
} from "lucide-react";

const ACTIVITY_ICONS = {
  ticket: LifeBuoy,
  document: FileText,
  download: Download,
  collaboration: Workflow,
  footprint: UserRound,
  contact: Mail
};

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function resolveHref(locale, href) {
  if (!href || href === "#") {
    return "#";
  }

  return href.startsWith("/admin") ? localizedPath(locale, href) : href;
}

function resolveTitle(item, labels) {
  const events = labels?.events || {};
  return events[item.activityKey] || events[item.eventType] || item.title;
}

function resolveMeta(item, labels) {
  const metaLabels = labels?.metaLabels || {};
  if (item.metaKey === "openSubtasks") {
    const label = metaLabels.openSubtasks || "{count} open subtasks";
    return label.replace("{count}", item.metaCount ?? 0);
  }

  return item.metaKey ? metaLabels[item.metaKey] || item.meta : item.meta;
}

export function AdminActivityFeed({ items = [], emptyText, labels = {}, locale }) {
  if (!items.length) {
    return <p className="admin-empty-copy">{emptyText}</p>;
  }

  return (
    <div className="admin-activity-feed">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.footprint;
        const meta = resolveMeta(item, labels);
        return (
          <Link className="admin-activity-item" href={resolveHref(locale, item.href)} key={item.id} prefetch={false}>
            <span className="admin-activity-icon">
              <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{resolveTitle(item, labels)}</strong>
              {meta ? <p>{meta}</p> : null}
            </div>
            <time>{formatDate(item.createdAt, locale)}</time>
          </Link>
        );
      })}
    </div>
  );
}
