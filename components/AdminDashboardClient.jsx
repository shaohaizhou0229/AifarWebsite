"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Download,
  FileText,
  Globe2,
  LifeBuoy,
  Mail,
  RefreshCw,
  Users,
  UserRound
} from "lucide-react";
import { AdminActivityFeed } from "@/components/AdminActivityFeed";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { AdminDataPanel } from "@/components/AdminDataPanel";
import { AdminMetricCard } from "@/components/AdminMetricCard";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { loadAdminDashboard, readCachedAdminDashboard, writeCachedAdminDashboard } from "@/components/admin-dashboard-cache";
import { localizedPath } from "@/i18n/routing";

const DONUT_COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#64748b", "#a855f7", "#ef4444"];

function maxTrendValue(trend = [], keys = ["views"]) {
  return Math.max(1, ...trend.flatMap((point) => keys.map((key) => Number(point[key] || 0))));
}

function rangeHref(locale, days) {
  return `${localizedPath(locale, "/admin/")}?range=${days}`;
}

function localizedAdminHref(locale, href) {
  const value = String(href || "/admin/");
  const [pathname, query = ""] = value.split("?");
  return `${localizedPath(locale, pathname)}${query ? `?${query}` : ""}`;
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function resolveLabel(labels = {}, key = "") {
  return labels[key] || key;
}

function RangeTabs({ locale, rangeDays, labels }) {
  return (
    <div className="admin-traffic-controls">
      <nav className="admin-range-tabs" aria-label={labels.label}>
        <Link className={rangeDays === 1 ? "active" : ""} href={rangeHref(locale, 1)} prefetch={false}>{labels.today}</Link>
        <Link className={rangeDays === 7 ? "active" : ""} href={rangeHref(locale, 7)} prefetch={false}>{labels.sevenDays}</Link>
      </nav>
      <Link className="admin-icon-button" href={rangeHref(locale, rangeDays)} prefetch={false} aria-label={labels.refresh}>
        <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
      </Link>
    </div>
  );
}

function VisitLineChart({ trend = [], labels }) {
  const max = maxTrendValue(trend, ["views"]);
  const points = trend.map((point, index) => {
    const x = trend.length <= 1 ? 0 : (index / (trend.length - 1)) * 100;
    const y = 100 - (Number(point.views || 0) / max) * 82 - 9;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = points ? `0,100 ${points} 100,100` : "";

  return (
    <div className="admin-traffic-chart admin-traffic-chart-visitors" aria-label={labels.visitsTrend}>
      <svg viewBox="0 0 100 100" role="img" preserveAspectRatio="none">
        {areaPoints ? <polygon points={areaPoints} /> : null}
        <polyline points={points} />
      </svg>
      <div className="admin-traffic-bars">
        {trend.map((point) => (
          <div key={point.date}>
            <small>{point.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function DownloadBarChart({ trend = [], labels }) {
  const max = maxTrendValue(trend, ["clientDownloads", "documentDownloads"]);

  return (
    <div className="admin-download-chart" aria-label={labels.downloadTrend}>
      {trend.map((point) => (
        <div className="admin-download-bar-group" key={point.date}>
          <span className="admin-traffic-bar-client" style={{ height: `${Math.max(4, (Number(point.clientDownloads || 0) / max) * 100)}%` }} />
          <span className="admin-traffic-bar-document" style={{ height: `${Math.max(4, (Number(point.documentDownloads || 0) / max) * 100)}%` }} />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ items = [], labels = {}, labelMap = {}, total = 0, emptyText }) {
  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;
  const max = Math.max(1, ...items.map((item) => Number(item.count || 0)));

  return (
    <div className="admin-horizontal-bars">
      {items.map((item) => (
        <div key={item.key}>
          <span>{resolveLabel(labelMap, item.key)}</span>
          <div><i style={{ width: `${Math.max(3, (Number(item.count || 0) / max) * 100)}%` }} /></div>
          <strong>{item.count}</strong>
          <small>{total ? `${Math.round((Number(item.count || 0) / total) * 100)}%` : labels.noShare}</small>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items = [], labels = {}, labelMap = {}, total = 0, emptyText }) {
  const segments = useMemo(() => {
    let start = 0;
    return items.map((item, index) => {
      const value = total ? (Number(item.count || 0) / total) * 100 : 0;
      const segment = `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}% ${start + value}%`;
      start += value;
      return segment;
    });
  }, [items, total]);

  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut-chart" style={{ background: `conic-gradient(${segments.join(", ")})` }}>
        <span>{total}</span>
      </div>
      <div className="admin-donut-legend">
        {items.map((item, index) => (
          <span key={item.key || item.locale}>
            <i style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
            {resolveLabel(labelMap, item.key || item.locale)} <strong>{labels.sharePrefix || ""}{total ? `${Math.round((Number(item.count || 0) / total) * 100)}%` : "0%"}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function DataTable({ items = [], labels = {}, labelMap = {}, total = 0, emptyText }) {
  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;

  return (
    <div className="admin-traffic-table">
      <div>
        <span>{labels.name}</span>
        <span>{labels.count}</span>
        <span>{labels.share}</span>
      </div>
      {items.map((item) => (
        <div key={item.key}>
          <span>{resolveLabel(labelMap, item.key)}</span>
          <strong>{item.count}</strong>
          <strong>{total ? `${Math.round((Number(item.count || 0) / total) * 100)}%` : "-"}</strong>
        </div>
      ))}
    </div>
  );
}

function CollaborationTodoList({ items = [], labels = {}, locale }) {
  if (!items.length) return <p className="admin-empty-copy">{labels.empty}</p>;

  return (
    <div className="admin-pending-list admin-collaboration-todo-list">
      {items.map((item) => (
        <Link href={localizedAdminHref(locale, item.href)} key={item.key} prefetch={false}>
          <span className="admin-pending-icon" aria-hidden="true">
            <ClipboardList size={15} strokeWidth={1.8} />
          </span>
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta || labels.noContext}</span>
            {item.dueAt ? <small>{labels.dueAt}: {formatDate(item.dueAt, locale)}</small> : null}
          </div>
          <AdminStatusPill tone={item.tone}>{labels.statuses[item.statusKey] || item.statusKey}</AdminStatusPill>
          <span className="admin-pending-enter">{labels.enter}</span>
        </Link>
      ))}
    </div>
  );
}

export function AdminDashboardClient({ locale, page, rangeDays, initialDashboard = null, loadingLabel, errorLabel }) {
  const safeRangeDays = rangeDays === 1 ? 1 : 7;
  const [dashboard, setDashboard] = useState(() => initialDashboard || readCachedAdminDashboard(locale, safeRangeDays, 5 * 60 * 1000));
  const [loading, setLoading] = useState(() => !initialDashboard && !readCachedAdminDashboard(locale, safeRangeDays, 5 * 60 * 1000));
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialDashboard) {
      writeCachedAdminDashboard(locale, safeRangeDays, initialDashboard);
      return undefined;
    }

    let cancelled = false;
    const cached = readCachedAdminDashboard(locale, safeRangeDays, 5 * 60 * 1000);
    if (cached) {
      setDashboard(cached);
      setLoading(false);
    }

    async function loadDashboard() {
      setLoading(!cached);
      setError("");
      try {
        const nextDashboard = await loadAdminDashboard(locale, safeRangeDays);
        if (!cancelled) setDashboard(nextDashboard);
      } catch (loadError) {
        if (!cancelled && !cached) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [initialDashboard, locale, safeRangeDays, errorLabel]);

  const metricCards = dashboard ? [
    ["todayViews", dashboard.metrics.todayViews, `${dashboard.metrics.totalViews} ${page.metrics.details.totalInRange}`, "good", "positive", UserRound],
    ["newUsers", dashboard.metrics.newUsers, page.metrics.details.today, "neutral", "neutral", Users],
    ["pendingSiteContent", dashboard.metrics.pendingSiteContent, dashboard.metrics.pendingSiteContent ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.pendingSiteContent ? "attention" : "neutral", dashboard.metrics.pendingSiteContent ? "warning" : "positive", Globe2],
    ["draftDocuments", dashboard.metrics.draftDocuments, dashboard.metrics.draftDocuments ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.draftDocuments ? "attention" : "neutral", dashboard.metrics.draftDocuments ? "warning" : "positive", FileText],
    ["draftClients", dashboard.metrics.draftClients, dashboard.metrics.draftClients ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.draftClients ? "attention" : "neutral", dashboard.metrics.draftClients ? "warning" : "positive", Download],
    ["openTickets", dashboard.metrics.openTickets, dashboard.metrics.openTickets ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.openTickets ? "attention" : "neutral", dashboard.metrics.openTickets ? "warning" : "positive", LifeBuoy],
    ["contactRequests", dashboard.metrics.contactRequests, dashboard.metrics.contactRequests ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.contactRequests ? "attention" : "neutral", dashboard.metrics.contactRequests ? "warning" : "positive", Mail]
  ] : [];

  const totalPageViews = dashboard?.metrics?.totalViews || 0;
  const totalClientDownloads = dashboard?.analytics?.downloads?.client || 0;
  const totalDocumentDownloads = dashboard?.analytics?.downloads?.document || 0;

  return (
    <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
      {dashboard ? (
        <>
          <section className="admin-metric-grid admin-metric-grid-seven">
            {metricCards.map(([key, value, meta, tone, metaTone, Icon]) => (
              <AdminMetricCard key={key} label={page.metrics[key]} value={value} meta={meta} metaTone={metaTone} tone={tone} icon={Icon} />
            ))}
          </section>

          <section className="admin-dashboard-grid admin-operations-grid">
            <div className="admin-dashboard-column admin-dashboard-column-main">
              <AdminDataPanel
                title={page.traffic.title}
                meta={page.traffic.meta}
                action={<RangeTabs locale={locale} rangeDays={safeRangeDays} labels={page.ranges} />}
                className="admin-traffic-panel"
              >
                {dashboard.analytics.hasData ? (
                  <>
                    <div className="admin-traffic-summary">
                      <div>
                        <span>{page.metrics.totalViews}</span>
                        <strong>{dashboard.metrics.totalViews}</strong>
                      </div>
                      <div>
                        <span>{page.traffic.visitedPages}</span>
                        <strong>{dashboard.analytics.visitedPages || 0}</strong>
                        {page.traffic.visitedPagesHelp ? <small>{page.traffic.visitedPagesHelp}</small> : null}
                      </div>
                    </div>
                    <VisitLineChart trend={dashboard.analytics.trend} labels={page.traffic} />
                    <div className="admin-dashboard-split admin-analysis-split">
                      <div>
                        <h3>{page.traffic.pageCategoriesTitle}</h3>
                        <HorizontalBars items={dashboard.analytics.pageCategories} labels={page.traffic} labelMap={page.traffic.pageCategories} total={totalPageViews} emptyText={page.traffic.empty} />
                      </div>
                      <div>
                        <h3>{page.traffic.languages}</h3>
                        <DonutChart items={dashboard.analytics.languages} labels={page.traffic} labelMap={page.traffic.languageNames} total={totalPageViews} emptyText={page.traffic.empty} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="admin-empty-copy">{page.traffic.empty}</p>
                )}
              </AdminDataPanel>

              <AdminDataPanel
                title={page.downloads.title}
                meta={page.downloads.meta}
                action={<RangeTabs locale={locale} rangeDays={safeRangeDays} labels={page.ranges} />}
                className="admin-traffic-panel"
              >
                {totalClientDownloads || totalDocumentDownloads ? (
                  <>
                    <div className="admin-traffic-summary">
                      <div>
                        <span>{page.downloads.clientDownloads}</span>
                        <strong>{totalClientDownloads}</strong>
                      </div>
                      <div>
                        <span>{page.downloads.documentDownloads}</span>
                        <strong>{totalDocumentDownloads}</strong>
                      </div>
                    </div>
                    <DownloadBarChart trend={dashboard.analytics.trend} labels={page.downloads} />
                    <div className="admin-dashboard-split">
                      <div>
                        <h3>{page.downloads.clientBreakdown}</h3>
                        <DataTable items={dashboard.analytics.clientDownloads} labels={page.downloads} labelMap={page.downloads.clients} total={totalClientDownloads} emptyText={page.downloads.empty} />
                      </div>
                      <div>
                        <h3>{page.downloads.documentBreakdown}</h3>
                        <DataTable items={dashboard.analytics.documentDownloads} labels={page.downloads} labelMap={page.downloads.documentCategories} total={totalDocumentDownloads} emptyText={page.downloads.empty} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="admin-empty-copy">{page.downloads.empty}</p>
                )}
              </AdminDataPanel>
            </div>

            <div className="admin-dashboard-column admin-dashboard-column-side">
              <AdminDataPanel title={page.pending.title} meta={page.pending.meta}>
                <CollaborationTodoList items={dashboard.pendingWork} labels={page.pending} locale={locale} />
              </AdminDataPanel>

              <AdminDataPanel title={page.activity.title} meta={page.activity.meta} action={<BarChart3 aria-hidden="true" size={16} strokeWidth={1.8} />}>
                <AdminActivityFeed items={dashboard.activity.slice(0, 8)} emptyText={page.activity.empty} labels={page.activity} locale={locale} />
              </AdminDataPanel>
            </div>
          </section>
        </>
      ) : null}
    </AdminAsyncState>
  );
}
