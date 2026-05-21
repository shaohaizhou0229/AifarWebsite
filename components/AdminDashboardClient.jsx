"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  Download,
  FileText,
  LifeBuoy,
  Mail,
  RefreshCw,
  Users,
  UserRound
} from "lucide-react";
import { AdminActivityFeed } from "@/components/AdminActivityFeed";
import { AdminAsyncState } from "@/components/AdminAsyncState";
import { AdminDataPanel } from "@/components/AdminDataPanel";
import { AdminHealthList } from "@/components/AdminHealthList";
import { AdminMetricCard } from "@/components/AdminMetricCard";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { loadAdminDashboard, readCachedAdminDashboard, writeCachedAdminDashboard } from "@/components/admin-dashboard-cache";
import { localizedPath } from "@/i18n/routing";

function maxTrendValue(trend = [], mode = "visitors") {
  if (mode === "downloads") {
    return Math.max(1, ...trend.flatMap((point) => [point.downloads, point.clientDownloads, point.documentDownloads]));
  }
  return Math.max(1, ...trend.map((point) => point.views));
}

function TrafficChart({ trend = [], labels, mode }) {
  const max = maxTrendValue(trend, mode);
  const points = trend.map((point, index) => {
    const x = trend.length <= 1 ? 0 : (index / (trend.length - 1)) * 100;
    const value = mode === "downloads" ? point.downloads : point.views;
    const y = 100 - (value / max) * 86 - 7;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = points ? `0,100 ${points} 100,100` : "";

  return (
    <div className={`admin-traffic-chart admin-traffic-chart-${mode}`} aria-label={labels.title}>
      <svg viewBox="0 0 100 100" role="img" preserveAspectRatio="none">
        {areaPoints ? <polygon points={areaPoints} /> : null}
        <polyline points={points} />
      </svg>
      <div className="admin-traffic-bars">
        {trend.map((point) => (
          <div key={point.date}>
            <span className="admin-traffic-bar-client" style={{ height: `${Math.max(4, ((point.clientDownloads || point.downloads || 0) / max) * 80)}%` }} />
            <span className="admin-traffic-bar-document" style={{ height: `${Math.max(4, ((point.documentDownloads || 0) / max) * 80)}%` }} />
            <small>{point.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrafficTable({ items = [], emptyText, labels, nameLabel, valueLabel, total = 0 }) {
  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;

  return (
    <div className="admin-traffic-table">
      <div>
        <span>{nameLabel || labels.page || "Page"}</span>
        <span>{valueLabel || labels.views || "Views"}</span>
        <span>{labels.share || "Share"}</span>
      </div>
      {items.map((item) => (
        <div key={item.path || item.locale || item.name}>
          <span>{item.path || item.locale || item.name}</span>
          <strong>{item.count}</strong>
          <strong>{total ? `${Math.round((item.count / total) * 100)}%` : "-"}</strong>
        </div>
      ))}
    </div>
  );
}

function rangeHref(locale, days) {
  return `${localizedPath(locale, "/admin/")}?range=${days}`;
}

function localizedAdminHref(locale, href) {
  const value = String(href || "/admin/");
  const [pathname, query = ""] = value.split("?");
  return `${localizedPath(locale, pathname)}${query ? `?${query}` : ""}`;
}

function localizeHealthItems(dashboard, page) {
  return dashboard.moduleHealth.map((item) => ({
    ...item,
    label: page.health.modules[item.key]?.label || item.key,
    summary: page.health.modules[item.key]?.summary || "",
    status: page.health.statuses[item.statusKey] || item.statusKey
  }));
}

const PENDING_ICONS = {
  newContacts: Mail,
  unassignedTickets: LifeBuoy,
  draftContent: FileText,
  downloadGaps: Download,
  overdueSubtasks: ClipboardList
};

export function AdminDashboardClient({ locale, page, rangeDays, initialDashboard = null, loadingLabel, errorLabel }) {
  const [dashboard, setDashboard] = useState(() => initialDashboard || readCachedAdminDashboard(locale, rangeDays, 5 * 60 * 1000));
  const [loading, setLoading] = useState(() => !initialDashboard && !readCachedAdminDashboard(locale, rangeDays, 5 * 60 * 1000));
  const [error, setError] = useState("");
  const [trafficMode, setTrafficMode] = useState("visitors");

  useEffect(() => {
    if (initialDashboard) {
      writeCachedAdminDashboard(locale, rangeDays, initialDashboard);
      return undefined;
    }

    let cancelled = false;
    const cached = readCachedAdminDashboard(locale, rangeDays, 5 * 60 * 1000);
    if (cached) {
      setDashboard(cached);
      setLoading(false);
    }

    async function loadDashboard() {
      setLoading(!cached);
      setError("");
      try {
        const nextDashboard = await loadAdminDashboard(locale, rangeDays);
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
  }, [initialDashboard, locale, rangeDays, errorLabel]);

  const metricCards = dashboard ? [
    ["todayViews", dashboard.metrics.todayViews, `${dashboard.metrics.totalViews} ${page.metrics.details.totalInRange}`, "good", "positive", UserRound],
    ["newContacts", dashboard.metrics.newContacts, dashboard.metrics.newContacts ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.newContacts ? "attention" : "neutral", dashboard.metrics.newContacts ? "warning" : "positive", Mail],
    ["openTickets", dashboard.metrics.openTickets, dashboard.metrics.openTickets ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.openTickets ? "attention" : "neutral", dashboard.metrics.openTickets ? "warning" : "positive", LifeBuoy],
    ["newUsers", dashboard.metrics.newUsers, page.metrics.details.today, "neutral", "neutral", Users],
    ["draftContent", dashboard.metrics.draftContent, dashboard.metrics.draftContent ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.draftContent ? "attention" : "neutral", dashboard.metrics.draftContent ? "warning" : "positive", FileText],
    ["collaborationTodo", dashboard.metrics.collaborationTodo, dashboard.metrics.collaborationTodo ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.collaborationTodo ? "attention" : "neutral", dashboard.metrics.collaborationTodo ? "warning" : "positive", ClipboardList]
  ] : [];
  const downloadSources = dashboard ? [
    { name: page.traffic.clientDownloads, count: dashboard.analytics.downloads?.client || 0 },
    { name: page.traffic.documentDownloads, count: dashboard.analytics.downloads?.document || 0 }
  ] : [];
  const totalDownloadSources = downloadSources.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
        {dashboard ? (
          <>
            <section className="admin-metric-grid">
              {metricCards.map(([key, value, meta, tone, metaTone, Icon]) => (
                <AdminMetricCard key={key} label={page.metrics[key]} value={value} meta={meta} metaTone={metaTone} tone={tone} icon={Icon} />
              ))}
            </section>

            <section className="admin-dashboard-grid">
              <div className="admin-dashboard-column admin-dashboard-column-main">
                <AdminDataPanel
                  title={page.traffic.title}
                  meta={page.traffic.meta}
                  action={(
                    <div className="admin-traffic-controls">
                      <nav className="admin-range-tabs" aria-label={page.ranges.label}>
                        <Link className={rangeDays === 1 ? "active" : ""} href={rangeHref(locale, 1)} prefetch={false}>{page.ranges.today}</Link>
                        <Link className={rangeDays === 7 ? "active" : ""} href={rangeHref(locale, 7)} prefetch={false}>{page.ranges.sevenDays}</Link>
                        <Link className={rangeDays === 30 ? "active" : ""} href={rangeHref(locale, 30)} prefetch={false}>{page.ranges.thirtyDays}</Link>
                      </nav>
                      <Link className="admin-icon-button" href={rangeHref(locale, rangeDays)} prefetch={false} aria-label={page.ranges.refresh}>
                        <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
                      </Link>
                      <div className="admin-panel-tabs" aria-label={page.traffic.tabsLabel}>
                        <button type="button" className={trafficMode === "visitors" ? "active" : ""} onClick={() => setTrafficMode("visitors")}>{page.traffic.tabs.visitors}</button>
                        <button type="button" className={trafficMode === "downloads" ? "active" : ""} onClick={() => setTrafficMode("downloads")}>{page.traffic.tabs.downloads}</button>
                      </div>
                    </div>
                  )}
                  className="admin-traffic-panel"
                >
                  {dashboard.analytics.hasData || trafficMode === "downloads" ? (
                    <>
                      <div className="admin-traffic-summary">
                        {trafficMode === "downloads" ? (
                          <>
                            <div>
                              <span>{page.traffic.clientDownloads}</span>
                              <strong>{dashboard.analytics.downloads?.client || 0}</strong>
                            </div>
                            <div>
                              <span>{page.traffic.documentDownloads}</span>
                              <strong>{dashboard.analytics.downloads?.document || 0}</strong>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span>{page.metrics.totalViews}</span>
                              <strong>{dashboard.metrics.totalViews}</strong>
                            </div>
                            <div>
                              <span>{page.traffic.visitedPages}</span>
                              <strong>{dashboard.analytics.visitedPages || 0}</strong>
                              {page.traffic.visitedPagesHelp ? <small>{page.traffic.visitedPagesHelp}</small> : null}
                            </div>
                          </>
                        )}
                      </div>
                      <TrafficChart trend={dashboard.analytics.trend} labels={page.traffic} mode={trafficMode} />
                      <div className="admin-dashboard-split">
                        {trafficMode === "downloads" ? (
                          <div>
                            <h3>{page.traffic.downloadSources}</h3>
                            <TrafficTable items={downloadSources} emptyText={page.traffic.downloadEmpty} labels={page.traffic} nameLabel={page.traffic.source} valueLabel={page.traffic.count} total={totalDownloadSources} />
                          </div>
                        ) : (
                          <>
                            <div>
                              <h3>{page.traffic.topPages}</h3>
                              <TrafficTable items={dashboard.analytics.topPages} emptyText={page.traffic.empty} labels={page.traffic} nameLabel={page.traffic.page} total={dashboard.metrics.totalViews} />
                            </div>
                            <div>
                              <h3>{page.traffic.languages}</h3>
                              <TrafficTable items={dashboard.analytics.languages} emptyText={page.traffic.empty} labels={page.traffic} nameLabel={page.traffic.language} total={dashboard.metrics.totalViews} />
                            </div>
                          </>
                        )}
                      </div>
                      <Link className="admin-panel-footer-link" href={rangeHref(locale, 30)} prefetch={false}>{page.traffic.viewFull} <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>
                    </>
                  ) : (
                    <p className="admin-empty-copy">{page.traffic.empty}</p>
                  )}
                </AdminDataPanel>

                <AdminDataPanel title={page.activity.title} meta={page.activity.meta}>
                  <AdminActivityFeed items={dashboard.activity.slice(0, 6)} emptyText={page.activity.empty} labels={page.activity} locale={locale} />
                  <Link className="admin-panel-footer-link" href={localizedPath(locale, "/admin/users/")} prefetch={false}>{page.activity.viewAll} <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>
                </AdminDataPanel>
              </div>

              <div className="admin-dashboard-column admin-dashboard-column-side">
                <AdminDataPanel title={page.pending.title} meta={page.pending.meta}>
                  <div className="admin-pending-list">
                    {dashboard.pendingWork.map((item) => {
                      const Icon = PENDING_ICONS[item.key] || ClipboardList;
                      return (
                        <Link href={localizedAdminHref(locale, item.href)} key={item.key} prefetch={false}>
                          <span className="admin-pending-icon" aria-hidden="true">
                            <Icon size={15} strokeWidth={1.8} />
                          </span>
                          <div>
                            <strong>{page.pending.items[item.key]}</strong>
                            <span>{item.count}</span>
                          </div>
                          <AdminStatusPill tone={item.tone}>{page.pending.statuses[item.count ? item.statusKey : "clear"]}</AdminStatusPill>
                          <span className="admin-pending-enter">{page.pending.enter}</span>
                        </Link>
                      );
                    })}
                  </div>
                </AdminDataPanel>

                <AdminDataPanel title={page.health.title} meta={page.health.meta} action={<Link className="admin-panel-action" href={localizedPath(locale, "/admin/")} prefetch={false}>{page.health.viewAll}</Link>}>
                  <AdminHealthList items={localizeHealthItems(dashboard, page)} labels={page.health} locale={locale} />
                </AdminDataPanel>
              </div>
            </section>
          </>
        ) : null}
      </AdminAsyncState>
    </>
  );
}
