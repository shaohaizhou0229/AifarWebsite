import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { listAdminProfiles } from "@/lib/profiles";
import { getAdminTicketStats, listAdminTickets, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { getRequestTypeLabel, getTicketCategoryLabel, getTicketPriorityLabel, getTicketStatusLabel } from "@/i18n/labels";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/support/";
const STATUS_OPTIONS = ["new", "in_progress", "waiting_customer", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
const CATEGORY_OPTIONS = ["account_access", "client_download", "installation", "product_usage", "bug_report", "partnership", "other"];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminSupport");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

function getFilterValue(query, key, allowedValues) {
  const value = typeof query?.[key] === "string" ? query[key] : "";
  return allowedValues.has(value) ? value : "";
}

export default async function AdminSupportPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome, messages] = await Promise.all([
    getPageMessages(locale, "adminSupport"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  try {
    await requireAdmin(getProfile);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return (
        <main>
          <PageHero eyebrow={page.eyebrow} title={page.deniedTitle} lead={page.deniedLead} />
        </main>
      );
    }
    redirect(localizedPath(locale, "/login/"));
  }

  const query = await searchParams;
  const filters = {
    status: getFilterValue(query, "status", TICKET_STATUSES),
    priority: getFilterValue(query, "priority", TICKET_PRIORITIES),
    category: getFilterValue(query, "category", TICKET_CATEGORIES),
    assignee: typeof query?.assignee === "string" ? query.assignee : "",
    q: typeof query?.q === "string" ? query.q.trim() : ""
  };

  const [tickets, stats, profiles] = await Promise.all([
    listAdminTickets(filters),
    getAdminTicketStats(),
    listAdminProfiles()
  ]);

  const adminLabels = messages.forms.admin;
  const statCards = [
    [page.stats.pending, stats.pending],
    [page.stats.inProgress, stats.inProgress],
    [page.stats.today, stats.today],
    [page.stats.closed, stats.closed]
  ];

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: adminHome.nav.home, href: "/admin/" },
              { label: page.breadcrumb }
            ]}
          />
          <AdminNav locale={locale} labels={adminHome.nav} current="support" />
          <div className="ticket-stat-grid">
            {statCards.map(([label, value]) => (
              <article className="ticket-stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <form className="ticket-filter-bar" action={localizedPath(locale, "/admin/support/")}>
            <div className="field">
              <label htmlFor="status">{page.filters.status}</label>
              <select id="status" name="status" defaultValue={filters.status}>
                <option value="">{page.filters.allStatuses}</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{getTicketStatusLabel(adminLabels, option)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="priority">{page.filters.priority}</label>
              <select id="priority" name="priority" defaultValue={filters.priority}>
                <option value="">{page.filters.allPriorities}</option>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{getTicketPriorityLabel(adminLabels, option)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="category">{page.filters.category}</label>
              <select id="category" name="category" defaultValue={filters.category}>
                <option value="">{page.filters.allCategories}</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{getTicketCategoryLabel(adminLabels, option)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="assignee">{page.filters.assignee}</label>
              <select id="assignee" name="assignee" defaultValue={filters.assignee}>
                <option value="">{page.filters.allAssignees}</option>
                <option value="unassigned">{adminLabels.unassigned}</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.displayName || profile.email}</option>
                ))}
              </select>
            </div>
            <div className="field ticket-search-field">
              <label htmlFor="q">{page.filters.keyword}</label>
              <input id="q" name="q" defaultValue={filters.q} placeholder={page.filters.keywordPlaceholder} />
            </div>
            <button className="button primary" type="submit">{page.filters.apply}</button>
            <a className="button secondary" href={localizedPath(locale, "/admin/support/")}>{page.filters.reset}</a>
          </form>
          <div className="ticket-table">
            {tickets.length ? tickets.map((ticket) => (
              <a className="ticket-row" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)}>
                <div className="ticket-main">
                  <h3>{ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}</h3>
                  <p>{ticket.name} - {ticket.workEmail}</p>
                  <span>{ticket.organization || page.notProvided}</span>
                </div>
                <div className="ticket-meta">
                  <span className="pill">{getTicketStatusLabel(adminLabels, ticket.status)}</span>
                  <span>{getTicketPriorityLabel(adminLabels, ticket.priority)}</span>
                  <span>{getTicketCategoryLabel(adminLabels, ticket.category || "other")}</span>
                  <span>{ticket.assigneeName || ticket.assigneeEmail || adminLabels.unassigned}</span>
                  <span>{formatDate(ticket.updatedAt || ticket.createdAt, locale)}</span>
                </div>
              </a>
            )) : (
              <article className="card admin-empty-state">
                <h2>{page.emptyTitle}</h2>
                <p>{page.emptyLead}</p>
              </article>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
