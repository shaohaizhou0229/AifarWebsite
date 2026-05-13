import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { getUserTicket } from "@/lib/tickets";

export const metadata = {
  title: "Ticket Detail | Aifar",
  description: "View a contact request and replies from the Aifar team.",
  alternates: { canonical: "/account/tickets/" }
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AccountTicketDetailPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login/");

  const { id } = await params;
  const result = await getUserTicket(user, id);
  if (!result) notFound();

  const { ticket, replies } = result;

  return (
    <main>
      <PageHero eyebrow="Ticket" title={ticket.subject || ticket.requestType.replace("_", " ")} lead={`Status: ${ticket.status.replace("_", " ")} - Submitted ${formatDate(ticket.createdAt)}`} />
      <section className="section alt">
        <div className="section-inner detail-layout">
          <article className="card detail-card">
            <h3>Your request</h3>
            <p>{ticket.message}</p>
          </article>
          <div className="reply-list">
            <h2>Replies</h2>
            {replies.length ? replies.map((reply) => (
              <article className="card" key={reply.id}>
                <h3>{reply.authorRole === "admin" ? "Aifar team" : "User"}</h3>
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
