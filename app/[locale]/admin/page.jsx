import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
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
import { AdminAccessDenied, AdminShell } from "@/components/AdminShell";
import { AdminDataPanel } from "@/components/AdminDataPanel";
import { AdminHealthList } from "@/components/AdminHealthList";
import { AdminMetricCard } from "@/components/AdminMetricCard";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getAdminDashboardOverview } from "@/lib/admin-dashboard";
import { getProfile } from "@/lib/profiles";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminHome");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

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

  return (
    <div className="admin-traffic-chart" aria-label={labels.title}>
      <svg viewBox="0 0 100 100" role="img" preserveAspectRatio="none">
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

function TrafficTable({ items = [], emptyText, labels }) {
  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;

  return (
    <div className="admin-traffic-table">
      <div>
        <span>{labels.page || "Page"}</span>
        <span>{labels.views || "Views"}</span>
      </div>
      {items.map((item) => (
        <div key={item.path || item.locale}>
          <span>{item.path || item.locale}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function rangeHref(locale, days) {
  return `${localizedPath(locale, "/admin/")}?range=${days}`;
}

export default async function AdminHomePage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "adminHome");
  const query = await searchParams;
  const rangeDays = [1, 7, 30].includes(Number(query?.range)) ? Number(query.range) : 7;

  let user;
  let profile;
  try {
    const context = await requireAdmin(getProfile);
    user = context.user;
    profile = context.profile;
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const dashboard = await getAdminDashboardOverview({ userId: user.id, analyticsDays: rangeDays });
  const metricCards = [
    ["todayViews", dashboard.metrics.todayViews, "good", UserRound],
    ["downloadClicks", dashboard.metrics.downloadClicks, "good", Download],
    ["newContacts", dashboard.metrics.newContacts, dashboard.metrics.newContacts ? "attention" : "neutral", Mail],
    ["openTickets", dashboard.metrics.openTickets, dashboard.metrics.openTickets ? "attention" : "neutral", LifeBuoy],
    ["newUsers", dashboard.metrics.newUsers, "neutral", Users],
    ["draftContent", dashboard.metrics.draftContent, dashboard.metrics.draftContent ? "attention" : "neutral", FileText]
  ];

  const healthItems = dashboard.moduleHealth.map((item) => ({
    ...item,
    label: page.health.modules[item.key]?.label || item.key,
    summary: page.health.modules[item.key]?.summary || "",
    status: page.health.statuses[item.statusKey] || item.statusKey
  }));

  return (
    <AdminShell
      locale={locale}
      labels={page}
      current="home"
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
      user={{
        name: profile?.displayName || user.email,
        email: profile?.email || user.email,
        initials: (profile?.displayName || user.email || "A").slice(0, 1).toUpperCase()
      }}
    >
      <div className="admin-dashboard-toolbar">
        <nav className="admin-range-tabs" aria-label={page.ranges.label}>
          <a className={rangeDays === 1 ? "active" : ""} href={rangeHref(locale, 1)}>{page.ranges.today}</a>
          <a className={rangeDays === 7 ? "active" : ""} href={rangeHref(locale, 7)}>{page.ranges.sevenDays}</a>
          <a className={rangeDays === 30 ? "active" : ""} href={rangeHref(locale, 30)}>{page.ranges.thirtyDays}</a>
        </nav>
        <a className="admin-icon-button" href={rangeHref(locale, rangeDays)} aria-label={page.ranges.refresh}>
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
        </a>
      </div>

      <section className="admin-metric-grid">
        {metricCards.map(([key, value, tone, Icon]) => (
          <AdminMetricCard key={key} label={page.metrics[key]} value={value} tone={tone} icon={Icon} />
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <AdminDataPanel title={page.traffic.title} meta={page.traffic.meta} className="admin-traffic-panel">
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
                  <TrafficTable
                    items={dashboard.analytics.topPages}
                    emptyText={page.traffic.empty}
                    labels={page.traffic}
                  />
                </div>
                <div>
                  <h3>{page.traffic.languages}</h3>
                  <TrafficTable
                    items={dashboard.analytics.languages}
                    emptyText={page.traffic.empty}
                    labels={page.traffic}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="admin-empty-copy">{page.traffic.empty}</p>
          )}
        </AdminDataPanel>

        <AdminDataPanel title={page.pending.title} meta={page.pending.meta}>
          <div className="admin-pending-list">
            {dashboard.pendingWork.map((item) => (
              <a href={localizedPath(locale, item.href)} key={item.key}>
                <span className="admin-check-box" aria-hidden="true" />
                <div>
                  <strong>{page.pending.items[item.key]}</strong>
                  <span>{item.count}</span>
                </div>
                <AdminStatusPill tone={item.tone}>{item.count ? page.health.statuses.needsReview : page.health.statuses.ready}</AdminStatusPill>
                <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
              </a>
            ))}
          </div>
        </AdminDataPanel>

        <AdminDataPanel title={page.activity.title} meta={page.activity.meta}>
          <AdminActivityFeed items={dashboard.activity} emptyText={page.activity.empty} labels={page.activity} locale={locale} />
        </AdminDataPanel>

        <AdminDataPanel title={page.health.title} meta={page.health.meta}>
          <AdminHealthList items={healthItems} labels={page.health} locale={locale} />
        </AdminDataPanel>
      </section>
    </AdminShell>
  );
}
