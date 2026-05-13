import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { listUserTickets } from "@/lib/tickets";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/account/tickets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "tickets");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function AccountTicketsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizedPath(locale, "/login/"));

  const [page, tickets] = await Promise.all([getPageMessages(locale, "tickets"), listUserTickets(user)]);

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="release-list">
            {tickets.length ? tickets.map((ticket) => (
              <a className="release" key={ticket.id} href={localizedPath(locale, `/account/tickets/${ticket.id}/`)}>
                <div>
                  <h3>{ticket.subject || ticket.requestType.replace("_", " ")}</h3>
                  <p>{formatDate(ticket.createdAt, locale)} - {ticket.workEmail}</p>
                </div>
                <span className="pill">{ticket.status.replace("_", " ")}</span>
              </a>
            )) : (
              <article className="card">
                <h3>{page.emptyTitle}</h3>
                <p>{page.emptyText}</p>
                <div className="card-actions"><a className="button primary" href={localizedPath(locale, "/contact/")}>{page.emptyAction}</a></div>
              </article>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
