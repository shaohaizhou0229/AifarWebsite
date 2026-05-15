import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { listAdminTickets, TICKET_STATUSES } from "@/lib/tickets";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/contact/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminContact");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function AdminContactPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminContact"),
    getPageMessages(locale, "adminHome")
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
  const status = typeof query?.status === "string" && TICKET_STATUSES.has(query.status) ? query.status : "";
  const tickets = await listAdminTickets(status);

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
          <AdminNav locale={locale} labels={adminHome.nav} current="contact" />
          <div className="status-actions">
            <a className="button secondary" href={localizedPath(locale, "/admin/contact/")}>{page.all}</a>
            <a className="button secondary" href={`${localizedPath(locale, "/admin/contact/")}?status=new`}>{page.new}</a>
            <a className="button secondary" href={`${localizedPath(locale, "/admin/contact/")}?status=in_progress`}>{page.inProgress}</a>
            <a className="button secondary" href={`${localizedPath(locale, "/admin/contact/")}?status=closed`}>{page.closed}</a>
          </div>
          <div className="release-list">
            {tickets.length ? tickets.map((ticket) => (
              <a className="release" key={ticket.id} href={localizedPath(locale, `/admin/tickets/${ticket.id}/`)}>
                <div>
                  <h3>{ticket.subject || ticket.requestType.replace("_", " ")}</h3>
                  <p>{formatDate(ticket.createdAt, locale)} - {ticket.name} - {ticket.workEmail}</p>
                </div>
                <span className="pill">{ticket.status.replace("_", " ")}</span>
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

