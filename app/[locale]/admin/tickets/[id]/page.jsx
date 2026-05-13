import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AdminTicketActions } from "@/components/AdminTicketActions";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { getAdminTicket } from "@/lib/tickets";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/tickets/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminTicketDetail");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminTicketDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([getPageMessages(locale, "adminTicketDetail"), getLocaleMessages(locale)]);

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

  const result = await getAdminTicket(id);
  if (!result) notFound();

  const { ticket, replies } = result;

  return (
    <main>
      <PageHero
        eyebrow={page.eyebrow}
        title={ticket.subject || ticket.requestType.replace("_", " ")}
        lead={`${ticket.name} - ${ticket.workEmail} - ${page.submitted} ${formatDate(ticket.createdAt, locale)}`}
      />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <article className="card detail-card">
            <h3>{page.requestTitle}</h3>
            <p>{ticket.message}</p>
            <p className="muted-line">{page.organization}: {ticket.organization || page.notProvided}</p>
          </article>
          <AdminTicketActions ticket={ticket} labels={messages.forms.admin} />
          <div className="reply-list">
            <h2>{page.replies}</h2>
            {replies.length ? replies.map((reply) => (
              <article className="card" key={reply.id}>
                <h3>{reply.authorName || reply.authorEmail || reply.authorRole}</h3>
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
