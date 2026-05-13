import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { listUserTickets } from "@/lib/tickets";

export const metadata = {
  title: "My Tickets | Aifar",
  description: "View contact requests associated with your Aifar account.",
  alternates: { canonical: "/account/tickets/" }
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function AccountTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/");

  const tickets = await listUserTickets(user);

  return (
    <main>
      <PageHero eyebrow="Tickets" title="Your contact requests." lead="Requests are linked by your account ID and work email, including matching historical submissions." />
      <section className="section alt">
        <div className="section-inner">
          <div className="release-list">
            {tickets.length ? tickets.map((ticket) => (
              <a className="release" key={ticket.id} href={`/account/tickets/${ticket.id}/`}>
                <div>
                  <h3>{ticket.subject || ticket.requestType.replace("_", " ")}</h3>
                  <p>{formatDate(ticket.createdAt)} - {ticket.workEmail}</p>
                </div>
                <span className="pill">{ticket.status.replace("_", " ")}</span>
              </a>
            )) : (
              <article className="card">
                <h3>No tickets yet</h3>
                <p>Submit a contact request and it will appear here.</p>
                <div className="card-actions"><a className="button primary" href="/contact/">Contact Aifar</a></div>
              </article>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
