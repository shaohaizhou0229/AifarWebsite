import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { getUserTicket } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";
import { getRequestTypeLabel, getTicketStatusLabel } from "@/i18n/labels";

const pathname = "/account/tickets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "ticketDetail");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AccountTicketDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizedPath(locale, "/login/"));

  const [page, messages, result] = await Promise.all([
    getPageMessages(locale, "ticketDetail"),
    getLocaleMessages(locale),
    getUserTicket(user, id)
  ]);
  if (!result) notFound();

  const { ticket, replies } = result;

  return (
    <main>
      <PageHero
        eyebrow={page.eyebrow}
        title={ticket.subject || getRequestTypeLabel(messages.forms, ticket.requestType)}
        lead={`${page.status}: ${getTicketStatusLabel(messages.forms.admin, ticket.status)} - ${page.submitted} ${formatDate(ticket.createdAt, locale)}`}
      />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <article className="card detail-card">
            <h3>{page.requestTitle}</h3>
            <p>{ticket.message}</p>
          </article>
          <div className="reply-list">
            <h2>{page.replies}</h2>
            {replies.length ? replies.map((reply) => (
              <article className="card" key={reply.id}>
                <h3>{reply.authorRole === "admin" ? page.aifarTeam : page.user}</h3>
                <p>{reply.message}</p>
                <p className="muted-line">{formatDate(reply.createdAt, locale)}</p>
              </article>
            )) : <p className="muted-line">{page.noReplies}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
