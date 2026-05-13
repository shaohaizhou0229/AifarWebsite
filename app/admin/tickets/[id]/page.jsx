import { notFound, redirect } from "next/navigation";
import { AdminTicketActions } from "@/components/AdminTicketActions";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { getAdminTicket } from "@/lib/tickets";

export const metadata = {
  title: "Admin Ticket Detail | Aifar",
  description: "Review, reply to, and update an Aifar contact request ticket.",
  alternates: { canonical: "/admin/tickets/" }
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AdminTicketDetailPage({ params }) {
  try {
    await requireAdmin(getProfile);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return (
        <main>
          <PageHero eyebrow="Admin" title="Administrator access required." lead="Your account does not have permission to manage this ticket." />
        </main>
      );
    }
    redirect("/login/");
  }

  const { id } = await params;
  const result = await getAdminTicket(id);
  if (!result) notFound();

  const { ticket, replies } = result;

  return (
    <main>
      <PageHero eyebrow="Admin ticket" title={ticket.subject || ticket.requestType.replace("_", " ")} lead={`${ticket.name} - ${ticket.workEmail} - Submitted ${formatDate(ticket.createdAt)}`} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <article className="card detail-card">
            <h3>Request</h3>
            <p>{ticket.message}</p>
            <p className="muted-line">Organization: {ticket.organization || "Not provided"}</p>
          </article>
          <AdminTicketActions ticket={ticket} />
          <div className="reply-list">
            <h2>Replies</h2>
            {replies.length ? replies.map((reply) => (
              <article className="card" key={reply.id}>
                <h3>{reply.authorName || reply.authorEmail || reply.authorRole}</h3>
                <p>{reply.message}</p>
                <p className="muted-line">{formatDate(reply.createdAt)}</p>
              </article>
            )) : <p className="muted-line">No replies yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
