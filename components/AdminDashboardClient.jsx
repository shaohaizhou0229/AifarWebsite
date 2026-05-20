"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
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
import { localizedPath } from "@/i18n/routing";

function maxTrendValue(trend = []) {
  return Math.max(1, ...trend.flatMap((point) => [point.views, point.downloads]));
}

function TrafficChart({ trend = [], labels }) {
  const max = maxTrendValue(trend);
  const points = trend.map((point, index) => {
    const x = trend.length <= 1 ? 0 : (index / (trend.length - 1)) * 100;
    const y = 100 - (point.views / max) * 86 - 7;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = points ? `0,100 ${points} 100,100` : "";

  return (
    <div className="admin-traffic-chart" aria-label={labels.title}>
      <svg viewBox="0 0 100 100" role="img" preserveAspectRatio="none">
        {areaPoints ? <polygon points={areaPoints} /> : null}
        <polyline points={points} />
      </svg>
      <div className="admin-traffic-bars">
        {trend.map((point) => (
          <div key={point.date}>
            <span style={{ height: `${Math.max(4, (point.downloads / max) * 80)}%` }} />
            <small>{point.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrafficTable({ items = [], emptyText, labels, nameLabel, total = 0 }) {
  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;

  return (
    <div className="admin-traffic-table">
      <div>
        <span>{nameLabel || labels.page || "Page"}</span>
        <span>{labels.views || "Views"}</span>
        <span>{labels.share || "Share"}</span>
      </div>
      {items.map((item) => (
        <div key={item.path || item.locale}>
          <span>{item.path || item.locale}</span>
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

function localizeHealthItems(dashboard, page) {
  return dashboard.moduleHealth.map((item) => ({
    ...item,
    label: page.health.modules[item.key]?.label || item.key,
    summary: page.health.modules[item.key]?.summary || "",
    status: page.health.statuses[item.statusKey] || item.statusKey
  }));
}

export function AdminDashboardClient({ locale, page, rangeDays, initialDashboard = null, loadingLabel, errorLabel }) {
  const skipInitialFetch = useRef(Boolean(initialDashboard));
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [loading, setLoading] = useState(!initialDashboard);
  const [error, setError] = useState("");

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return undefined;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/dashboard/?range=${rangeDays}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || errorLabel);
        if (!cancelled) setDashboard(result.dashboard || null);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || errorLabel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [rangeDays, errorLabel]);

  const metricCards = dashboard ? [
    ["todayViews", dashboard.metrics.todayViews, `${dashboard.metrics.totalViews} ${page.metrics.details.totalInRange}`, "good", "positive", UserRound],
    ["downloadClicks", dashboard.metrics.downloadClicks, page.metrics.details.daysWindow.replace("{days}", rangeDays), "good", "positive", Download],
    ["newContacts", dashboard.metrics.newContacts, dashboard.metrics.newContacts ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.newContacts ? "attention" : "neutral", dashboard.metrics.newContacts ? "warning" : "positive", Mail],
    ["openTickets", dashboard.metrics.openTickets, dashboard.metrics.openTickets ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.openTickets ? "attention" : "neutral", dashboard.metrics.openTickets ? "warning" : "positive", LifeBuoy],
    ["newUsers", dashboard.metrics.newUsers, page.metrics.details.today, "neutral", "neutral", Users],
    ["draftContent", dashboard.metrics.draftContent, dashboard.metrics.draftContent ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.draftContent ? "attention" : "neutral", dashboard.metrics.draftContent ? "warning" : "positive", FileText]
  ] : [];

  return (
    <>
      <div className="admin-dashboard-toolbar">
        <nav className="admin-range-tabs" aria-label={page.ranges.label}>
          <Link className={rangeDays === 1 ? "active" : ""} href={rangeHref(locale, 1)} prefetch={false}>{page.ranges.today}</Link>
          <Link className={rangeDays === 7 ? "active" : ""} href={rangeHref(locale, 7)} prefetch={false}>{page.ranges.sevenDays}</Link>
          <Link className={rangeDays === 30 ? "active" : ""} href={rangeHref(locale, 30)} prefetch={false}>{page.ranges.thirtyDays}</Link>
        </nav>
        <Link className="admin-icon-button" href={rangeHref(locale, rangeDays)} prefetch={false} aria-label={page.ranges.refresh}>
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
        </Link>
      </div>

      <AdminAsyncState loading={loading} error={error} loadingLabel={loadingLabel} errorLabel={errorLabel}>
        {dashboard ? (
          <>
            <section className="admin-metric-grid">
              {metricCards.map(([key, value, meta, tone, metaTone, Icon]) => (
                <AdminMetricCard key={key} label={page.metrics[key]} value={value} meta={meta} metaTone={metaTone} tone={tone} icon={Icon} />
              ))}
            </section>

            <section className="admin-dashboard-grid">
              <AdminDataPanel
                title={page.traffic.title}
                meta={page.traffic.meta}
                action={(
                  <div className="admin-panel-tabs" aria-label={page.traffic.tabsLabel}>
                    <span className="active">{page.traffic.tabs.visitors}</span>
                    <span>{page.traffic.tabs.downloads}</span>
                  </div>
                )}
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
                        <span>{page.traffic.downloads}</span>
                        <strong>{dashboard.metrics.downloadClicks}</strong>
                      </div>
                    </div>
                    <TrafficChart trend={dashboard.analytics.trend} labels={page.traffic} />
                    <div className="admin-dashboard-split">
                      <div>
                        <h3>{page.traffic.topPages}</h3>
                        <TrafficTable items={dashboard.analytics.topPages} emptyText={page.traffic.empty} labels={page.traffic} nameLabel={page.traffic.page} total={dashboard.metrics.totalViews} />
                      </div>
                      <div>
                        <h3>{page.traffic.languages}</h3>
                        <TrafficTable items={dashboard.analytics.languages} emptyText={page.traffic.empty} labels={page.traffic} nameLabel={page.traffic.language} total={dashboard.metrics.totalViews} />
                      </div>
                    </div>
                    <Link className="admin-panel-footer-link" href={rangeHref(locale, 30)} prefetch={false}>{page.traffic.viewFull} <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>
                  </>
                ) : (
                  <p className="admin-empty-copy">{page.traffic.empty}</p>
                )}
              </AdminDataPanel>

              <AdminDataPanel title={page.pending.title} meta={page.pending.meta} action={<Link className="admin-panel-action" href={localizedPath(locale, "/admin/support/")} prefetch={false}>{page.pending.viewAll}</Link>}>
                <div className="admin-pending-list">
                  {dashboard.pendingWork.map((item) => (
                    <Link href={localizedPath(locale, item.href)} key={item.key} prefetch={false}>
                      <span className="admin-check-box" aria-hidden="true" />
                      <div>
                        <strong>{page.pending.items[item.key]}</strong>
                        <span>{item.count}</span>
                      </div>
                      <AdminStatusPill tone={item.tone}>{page.pending.statuses[item.count ? item.statusKey : "clear"]}</AdminStatusPill>
                      <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
                    </Link>
                  ))}
                </div>
                <Link className="admin-panel-footer-link" href={localizedPath(locale, "/admin/collaboration/")} prefetch={false}>{page.pending.myTasks} <ArrowRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>
              </AdminDataPanel>

              <AdminDataPanel title={page.activity.title} meta={page.activity.meta} action={<Link className="admin-panel-action" href={localizedPath(locale, "/admin/users/")} prefetch={false}>{page.activity.viewAll}</Link>}>
                <AdminActivityFeed items={dashboard.activity} emptyText={page.activity.empty} labels={page.activity} locale={locale} />
              </AdminDataPanel>

              <AdminDataPanel title={page.health.title} meta={page.health.meta} action={<Link className="admin-panel-action" href={localizedPath(locale, "/admin/")} prefetch={false}>{page.health.viewAll}</Link>}>
                <AdminHealthList items={localizeHealthItems(dashboard, page)} labels={page.health} locale={locale} />
              </AdminDataPanel>
            </section>
          </>
        ) : null}
      </AdminAsyncState>
    </>
  );
}
