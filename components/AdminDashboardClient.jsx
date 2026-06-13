"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function safeRangeDays(value) {
  return Number(value) === 1 ? 1 : 7;
}

function currentUrlRanges() {
  if (typeof window === "undefined") {
    return { trafficRangeDays: 7, downloadRangeDays: 7 };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    trafficRangeDays: safeRangeDays(params.get("trafficRange") ?? params.get("range")),
    downloadRangeDays: safeRangeDays(params.get("downloadRange"))
  };
}

function isVisibleTrendLabel(index, total) {
  if (total <= 12) return true;
  return index % 3 === 0 || index === total - 1;
}

function trendLabelStyle(index, total) {
  if (index === 0) return { left: 0, transform: "none" };
  if (index === total - 1) return { left: "auto", right: 0, transform: "none" };
  return undefined;
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

function RangeTabs({ rangeDays, labels, loading = false, onChange, onRefresh }) {
  return (
    <div className="admin-traffic-controls">
      <nav className="admin-range-tabs" aria-label={labels.label}>
        <button type="button" className={rangeDays === 1 ? "active" : ""} onClick={() => onChange(1)} disabled={loading && rangeDays === 1} aria-pressed={rangeDays === 1}>
          {labels.today}
        </button>
        <button type="button" className={rangeDays === 7 ? "active" : ""} onClick={() => onChange(7)} disabled={loading && rangeDays === 7} aria-pressed={rangeDays === 7}>
          {labels.sevenDays}
        </button>
      </nav>
      <button type="button" className="admin-icon-button" onClick={onRefresh} disabled={loading} aria-label={labels.refresh}>
        <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function SkeletonLine({ className = "" }) {
  return <span className={`admin-dashboard-skeleton-line ${className}`} />;
}

function DashboardPanelSkeleton({ title, meta, compact = false }) {
  return (
    <section className="admin-panel admin-traffic-panel admin-dashboard-skeleton-panel">
      <header className="admin-panel-header">
        <div>
          <h2>{title}</h2>
          {meta ? <p>{meta}</p> : null}
        </div>
        <div className="admin-traffic-controls">
          <div className="admin-dashboard-skeleton-tabs">
            <SkeletonLine />
            <SkeletonLine />
          </div>
          <SkeletonLine className="admin-dashboard-skeleton-icon" />
        </div>
      </header>
      <div className="admin-dashboard-skeleton-summary">
        <SkeletonLine />
        <SkeletonLine />
      </div>
      <SkeletonLine className={compact ? "admin-dashboard-skeleton-chart compact" : "admin-dashboard-skeleton-chart"} />
      <div className="admin-dashboard-skeleton-rows">
        <SkeletonLine />
        <SkeletonLine />
        <SkeletonLine />
      </div>
    </section>
  );
}

function DashboardSkeleton({ page, loadingLabel }) {
  return (
    <div className="admin-dashboard-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">{loadingLabel}</span>
      <section className="admin-metric-grid admin-metric-grid-seven">
        {["todayViews", "newUsers", "pendingSiteContent", "draftDocuments", "draftClients", "openTickets", "contactRequests"].map((key) => (
          <article className="admin-metric-card admin-dashboard-skeleton-card" key={key}>
            <SkeletonLine className="admin-dashboard-skeleton-label" />
            <SkeletonLine className="admin-dashboard-skeleton-number" />
            <SkeletonLine className="admin-dashboard-skeleton-meta" />
          </article>
        ))}
      </section>
      <section className="admin-dashboard-grid admin-operations-grid">
        <div className="admin-dashboard-column admin-dashboard-column-main">
          <DashboardPanelSkeleton title={page.traffic.title} meta={page.traffic.meta} />
          <DashboardPanelSkeleton title={page.downloads.title} meta={page.downloads.meta} compact />
        </div>
        <div className="admin-dashboard-column admin-dashboard-column-side">
          <DashboardPanelSkeleton title={page.pending.title} meta={page.pending.meta} compact />
          <DashboardPanelSkeleton title={page.activity.title} meta={page.activity.meta} compact />
        </div>
      </section>
    </div>
  );
}

function AnalysisPanelBody({ loading = false, error = "", children }) {
  return (
    <div className="admin-analysis-panel-body" aria-busy={loading ? "true" : undefined}>
      <div className={loading ? "admin-analysis-panel-content updating" : "admin-analysis-panel-content"}>
        {children}
      </div>
      {loading ? (
        <div className="admin-analysis-panel-skeleton" aria-hidden="true">
          <span />
        </div>
      ) : null}
      {error ? <p className="admin-dashboard-inline-error">{error}</p> : null}
    </div>
  );
}

function VisitLineChart({ trend = [], labels }) {
  const max = maxTrendValue(trend, ["views"]);
  const totalPoints = Math.max(1, trend.length);
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
      <div className="admin-traffic-bars" style={{ "--traffic-points": totalPoints }}>
        {trend.map((point, index) => {
          const showLabel = isVisibleTrendLabel(index, trend.length);
          return (
            <div className={showLabel ? "" : "is-hidden"} key={point.date}>
              <small style={showLabel ? trendLabelStyle(index, trend.length) : undefined}>{point.label}</small>
            </div>
          );
        })}
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

export function AdminDashboardClient({ locale, page, rangeDays, trafficRangeDays, downloadRangeDays, initialDashboard = null, loadingLabel, errorLabel }) {
  const initialTrafficRangeDays = safeRangeDays(trafficRangeDays ?? rangeDays);
  const initialDownloadRangeDays = safeRangeDays(downloadRangeDays);
  const initialRanges = useMemo(() => ({
    trafficRangeDays: initialTrafficRangeDays,
    downloadRangeDays: initialDownloadRangeDays
  }), [initialTrafficRangeDays, initialDownloadRangeDays]);
  const [activeTrafficRangeDays, setActiveTrafficRangeDays] = useState(initialTrafficRangeDays);
  const [activeDownloadRangeDays, setActiveDownloadRangeDays] = useState(initialDownloadRangeDays);
  const [dashboard, setDashboard] = useState(() => initialDashboard || readCachedAdminDashboard(locale, initialRanges, 5 * 60 * 1000));
  const [loading, setLoading] = useState(() => !initialDashboard && !readCachedAdminDashboard(locale, initialRanges, 5 * 60 * 1000));
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState("");
  const [trafficError, setTrafficError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const dashboardRef = useRef(dashboard);
  const requestIdRef = useRef(0);

  useEffect(() => {
    dashboardRef.current = dashboard;
  }, [dashboard]);

  const syncRangeUrl = useCallback((nextTrafficRangeDays, nextDownloadRangeDays) => {
    if (typeof window === "undefined") return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("range");
    nextUrl.searchParams.set("trafficRange", String(nextTrafficRangeDays));
    nextUrl.searchParams.set("downloadRange", String(nextDownloadRangeDays));
    window.history.pushState({
      trafficRange: nextTrafficRangeDays,
      downloadRange: nextDownloadRangeDays
    }, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, []);

  const loadRanges = useCallback(async (nextTrafficRangeDays, nextDownloadRangeDays, { force = false, syncUrl = true, loadingScope = "all" } = {}) => {
    const nextRanges = {
      trafficRangeDays: safeRangeDays(nextTrafficRangeDays),
      downloadRangeDays: safeRangeDays(nextDownloadRangeDays)
    };
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setActiveTrafficRangeDays(nextRanges.trafficRangeDays);
    setActiveDownloadRangeDays(nextRanges.downloadRangeDays);
    if (loadingScope === "traffic" || loadingScope === "all") setTrafficError("");
    if (loadingScope === "download" || loadingScope === "all") setDownloadError("");
    if (syncUrl) syncRangeUrl(nextRanges.trafficRangeDays, nextRanges.downloadRangeDays);

    const cached = force ? null : readCachedAdminDashboard(locale, nextRanges, 5 * 60 * 1000);
    if (cached) {
      dashboardRef.current = cached;
      setDashboard(cached);
      setLoading(false);
      setTrafficLoading(false);
      setDownloadLoading(false);
      setError("");
      return;
    }

    const hasDashboard = Boolean(dashboardRef.current);
    setLoading(!hasDashboard);
    if (hasDashboard && (loadingScope === "traffic" || loadingScope === "all")) setTrafficLoading(true);
    if (hasDashboard && (loadingScope === "download" || loadingScope === "all")) setDownloadLoading(true);

    try {
      const nextDashboard = await loadAdminDashboard(locale, nextRanges, undefined, { force });
      if (requestIdRef.current !== requestId) return;
      dashboardRef.current = nextDashboard;
      setDashboard(nextDashboard);
      setError("");
      setTrafficError("");
      setDownloadError("");
    } catch (loadError) {
      if (requestIdRef.current !== requestId) return;
      const message = loadError.message || errorLabel;
      if (hasDashboard) {
        if (loadingScope === "download") {
          setDownloadError(message);
        } else if (loadingScope === "traffic") {
          setTrafficError(message);
        } else {
          setTrafficError(message);
          setDownloadError(message);
        }
      } else {
        setError(message);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setTrafficLoading(false);
        setDownloadLoading(false);
      }
    }
  }, [errorLabel, locale, syncRangeUrl]);

  useEffect(() => {
    if (initialDashboard) {
      writeCachedAdminDashboard(locale, initialRanges, initialDashboard);
      dashboardRef.current = initialDashboard;
      setDashboard(initialDashboard);
      setActiveTrafficRangeDays(initialRanges.trafficRangeDays);
      setActiveDownloadRangeDays(initialRanges.downloadRangeDays);
      setLoading(false);
      setTrafficLoading(false);
      setDownloadLoading(false);
      setError("");
      setTrafficError("");
      setDownloadError("");
      return undefined;
    }

    loadRanges(initialRanges.trafficRangeDays, initialRanges.downloadRangeDays, { syncUrl: false });
    return undefined;
  }, [initialDashboard, initialRanges, loadRanges, locale]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePopState = () => {
      const nextRanges = currentUrlRanges();
      loadRanges(nextRanges.trafficRangeDays, nextRanges.downloadRangeDays, { syncUrl: false });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loadRanges]);

  const handleTrafficRangeChange = useCallback((nextRangeDays) => {
    if (nextRangeDays === activeTrafficRangeDays && !trafficError) return;
    loadRanges(nextRangeDays, activeDownloadRangeDays, { loadingScope: "traffic" });
  }, [activeDownloadRangeDays, activeTrafficRangeDays, loadRanges, trafficError]);

  const handleTrafficRefresh = useCallback(() => {
    loadRanges(activeTrafficRangeDays, activeDownloadRangeDays, { force: true, syncUrl: false, loadingScope: "traffic" });
  }, [activeDownloadRangeDays, activeTrafficRangeDays, loadRanges]);

  const handleDownloadRangeChange = useCallback((nextRangeDays) => {
    if (nextRangeDays === activeDownloadRangeDays && !downloadError) return;
    loadRanges(activeTrafficRangeDays, nextRangeDays, { loadingScope: "download" });
  }, [activeDownloadRangeDays, activeTrafficRangeDays, downloadError, loadRanges]);

  const handleDownloadRefresh = useCallback(() => {
    loadRanges(activeTrafficRangeDays, activeDownloadRangeDays, { force: true, syncUrl: false, loadingScope: "download" });
  }, [activeDownloadRangeDays, activeTrafficRangeDays, loadRanges]);

  const metricCards = dashboard ? [
    ["todayViews", dashboard.metrics.todayViews, `${dashboard.metrics.totalViews} ${page.metrics.details.totalInRange}`, "good", "positive", UserRound],
    ["newUsers", dashboard.metrics.newUsers, page.metrics.details.today, "neutral", "neutral", Users],
    ["pendingSiteContent", dashboard.metrics.pendingSiteContent, dashboard.metrics.pendingSiteContent ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.pendingSiteContent ? "attention" : "neutral", dashboard.metrics.pendingSiteContent ? "warning" : "positive", Globe2],
    ["draftDocuments", dashboard.metrics.draftDocuments, dashboard.metrics.draftDocuments ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.draftDocuments ? "attention" : "neutral", dashboard.metrics.draftDocuments ? "warning" : "positive", FileText],
    ["draftClients", dashboard.metrics.draftClients, dashboard.metrics.draftClients ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.draftClients ? "attention" : "neutral", dashboard.metrics.draftClients ? "warning" : "positive", Download],
    ["openTickets", dashboard.metrics.openTickets, dashboard.metrics.openTickets ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.openTickets ? "attention" : "neutral", dashboard.metrics.openTickets ? "warning" : "positive", LifeBuoy],
    ["contactRequests", dashboard.metrics.contactRequests, dashboard.metrics.contactRequests ? page.metrics.details.needsReview : page.metrics.details.clear, dashboard.metrics.contactRequests ? "attention" : "neutral", dashboard.metrics.contactRequests ? "warning" : "positive", Mail]
  ] : [];

  const trafficAnalytics = dashboard?.trafficAnalytics || dashboard?.analytics || {};
  const downloadAnalytics = dashboard?.downloadAnalytics || dashboard?.analytics || {};
  const totalPageViews = dashboard?.metrics?.totalViews || 0;
  const totalClientDownloads = downloadAnalytics?.downloads?.client || 0;
  const totalDocumentDownloads = downloadAnalytics?.downloads?.document || 0;
  const hasTrafficData = Boolean(totalPageViews || trafficAnalytics?.visitedPages);
  const renderTrafficRangeControls = () => (
    <RangeTabs
      rangeDays={activeTrafficRangeDays}
      labels={page.ranges}
      loading={trafficLoading}
      onChange={handleTrafficRangeChange}
      onRefresh={handleTrafficRefresh}
    />
  );
  const renderDownloadRangeControls = () => (
    <RangeTabs
      rangeDays={activeDownloadRangeDays}
      labels={page.ranges}
      loading={downloadLoading}
      onChange={handleDownloadRangeChange}
      onRefresh={handleDownloadRefresh}
    />
  );

  if (!dashboard && loading) {
    return <DashboardSkeleton page={page} loadingLabel={loadingLabel} />;
  }

  return (
    <AdminAsyncState loading={false} error={!dashboard ? error : ""} loadingLabel={loadingLabel} errorLabel={errorLabel}>
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
                action={renderTrafficRangeControls()}
                className="admin-traffic-panel"
              >
                <AnalysisPanelBody loading={trafficLoading} error={trafficError}>
                  {hasTrafficData ? (
                    <>
                      <div className="admin-traffic-summary">
                        <div>
                          <span>{page.metrics.totalViews}</span>
                          <strong>{dashboard.metrics.totalViews}</strong>
                        </div>
                        <div>
                          <span>{page.traffic.visitedPages}</span>
                          <strong>{trafficAnalytics.visitedPages || 0}</strong>
                          {page.traffic.visitedPagesHelp ? <small>{page.traffic.visitedPagesHelp}</small> : null}
                        </div>
                      </div>
                      <VisitLineChart trend={trafficAnalytics.trend} labels={page.traffic} />
                      <div className="admin-dashboard-split admin-analysis-split">
                        <div>
                          <h3>{page.traffic.pageCategoriesTitle}</h3>
                          <HorizontalBars items={trafficAnalytics.pageCategories} labels={page.traffic} labelMap={page.traffic.pageCategories} total={totalPageViews} emptyText={page.traffic.empty} />
                        </div>
                        <div>
                          <h3>{page.traffic.languages}</h3>
                          <DonutChart items={trafficAnalytics.languages} labels={page.traffic} labelMap={page.traffic.languageNames} total={totalPageViews} emptyText={page.traffic.empty} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="admin-empty-copy">{page.traffic.empty}</p>
                  )}
                </AnalysisPanelBody>
              </AdminDataPanel>

              <AdminDataPanel
                title={page.downloads.title}
                meta={page.downloads.meta}
                action={renderDownloadRangeControls()}
                className="admin-traffic-panel"
              >
                <AnalysisPanelBody loading={downloadLoading} error={downloadError}>
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
                      <DownloadBarChart trend={downloadAnalytics.trend} labels={page.downloads} />
                      <div className="admin-dashboard-split">
                        <div>
                          <h3>{page.downloads.clientBreakdown}</h3>
                          <DataTable items={downloadAnalytics.clientDownloads} labels={page.downloads} labelMap={page.downloads.clients} total={totalClientDownloads} emptyText={page.downloads.empty} />
                        </div>
                        <div>
                          <h3>{page.downloads.documentBreakdown}</h3>
                          <DataTable items={downloadAnalytics.documentDownloads} labels={page.downloads} labelMap={page.downloads.documentCategories} total={totalDocumentDownloads} emptyText={page.downloads.empty} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="admin-empty-copy">{page.downloads.empty}</p>
                  )}
                </AnalysisPanelBody>
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
