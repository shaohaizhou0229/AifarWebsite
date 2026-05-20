import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
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

function CountList({ items = [], emptyText, renderLabel }) {
  if (!items.length) return <p className="admin-empty-copy">{emptyText}</p>;

  return (
    <div className="admin-count-list">
      {items.map((item) => (
        <div key={item.path || item.locale}>
          <span>{renderLabel(item)}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default async function AdminHomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "adminHome");

  let user;
  try {
    const context = await requireAdmin(getProfile);
    user = context.user;
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return <AdminAccessDenied title={page.deniedTitle} lead={page.deniedLead} />;
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const dashboard = await getAdminDashboardOverview({ userId: user.id });
  const metricCards = [
    ["todayViews", dashboard.metrics.todayViews, "good"],
    ["totalViews", dashboard.metrics.totalViews, "neutral"],
    ["downloadClicks", dashboard.metrics.downloadClicks, "good"],
    ["newContacts", dashboard.metrics.newContacts, dashboard.metrics.newContacts ? "attention" : "neutral"],
    ["openTickets", dashboard.metrics.openTickets, dashboard.metrics.openTickets ? "attention" : "neutral"],
    ["newUsers", dashboard.metrics.newUsers, "neutral"],
    ["draftContent", dashboard.metrics.draftContent, dashboard.metrics.draftContent ? "attention" : "neutral"],
    ["collaborationTodo", dashboard.metrics.collaborationTodo, dashboard.metrics.collaborationTodo ? "attention" : "neutral"]
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
      actions={(
        <>
          <a className="button secondary compact" href={localizedPath(locale, "/admin/users/")}>{page.quickActions.inviteUser}</a>
          <a className="button primary compact" href={localizedPath(locale, "/admin/docs/new/")}>{page.quickActions.newDocument}</a>
        </>
      )}
    >
      <section className="admin-metric-grid">
        {metricCards.map(([key, value, tone]) => (
          <AdminMetricCard key={key} label={page.metrics[key]} value={value} tone={tone} />
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <AdminDataPanel title={page.traffic.title} meta={page.traffic.meta} className="admin-traffic-panel">
          {dashboard.analytics.hasData ? (
            <>
              <TrafficChart trend={dashboard.analytics.trend} labels={page.traffic} />
              <div className="admin-dashboard-split">
                <div>
                  <h3>{page.traffic.topPages}</h3>
                  <CountList
                    items={dashboard.analytics.topPages}
                    emptyText={page.traffic.empty}
                    renderLabel={(item) => item.path}
                  />
                </div>
                <div>
                  <h3>{page.traffic.languages}</h3>
                  <CountList
                    items={dashboard.analytics.languages}
                    emptyText={page.traffic.empty}
                    renderLabel={(item) => item.locale}
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
                <div>
                  <strong>{page.pending.items[item.key]}</strong>
                  <span>{item.count}</span>
                </div>
                <AdminStatusPill tone={item.tone}>{item.count ? page.health.statuses.needsReview : page.health.statuses.ready}</AdminStatusPill>
              </a>
            ))}
          </div>
        </AdminDataPanel>

        <AdminDataPanel title={page.activity.title} meta={page.activity.meta}>
          <AdminActivityFeed items={dashboard.activity} emptyText={page.activity.empty} locale={locale} />
        </AdminDataPanel>

        <AdminDataPanel title={page.health.title} meta={page.health.meta}>
          <AdminHealthList items={healthItems} labels={page.health} locale={locale} />
        </AdminDataPanel>
      </section>
    </AdminShell>
  );
}
