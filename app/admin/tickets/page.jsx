import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { listAdminTickets, TICKET_STATUSES } from "@/lib/tickets";

export const metadata = {
  title: "Admin Tickets | Aifar",
  description: "Manage Aifar contact request tickets.",
  alternates: { canonical: "/admin/tickets/" }
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function AdminTicketsPage({ searchParams }) {
  try {
    await requireAdmin(getProfile);
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return (
        <main>
          <PageHero eyebrow="Admin" title="Administrator access required." lead="Your account does not have permission to manage Aifar website tickets." />
        </main>
      );
    }
    redirect("/login/");
  }

  const query = await searchParams;
  const status = typeof query?.status === "string" && TICKET_STATUSES.has(query.status) ? query.status : "";
  const tickets = await listAdminTickets(status);

  return (
    <main>
      <PageHero eyebrow="Admin" title="Contact request tickets." lead="Review, reply to, and close website contact requests." />
      <section className="section alt">
        <div className="section-inner">
          <div className="status-actions">
            <a className="button secondary" href="/admin/tickets/">All</a>
            <a className="button secondary" href="/admin/tickets/?status=new">New</a>
            <a className="button secondary" href="/admin/tickets/?status=in_progress">In progress</a>
            <a className="button secondary" href="/admin/tickets/?status=closed">Closed</a>
          </div>
          <div className="release-list">
            {tickets.map((ticket) => (
              <a className="release" key={ticket.id} href={`/admin/tickets/${ticket.id}/`}>
                <div>
                  <h3>{ticket.subject || ticket.requestType.replace("_", " ")}</h3>
                  <p>{formatDate(ticket.createdAt)} - {ticket.name} - {ticket.workEmail}</p>
                </div>
                <span className="pill">{ticket.status.replace("_", " ")}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
