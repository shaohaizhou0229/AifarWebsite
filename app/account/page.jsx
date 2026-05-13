import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profiles";
import { listUserTickets } from "@/lib/tickets";

export const metadata = {
  title: "Account | Aifar",
  description: "Manage your Aifar profile and support tickets.",
  alternates: { canonical: "/account/" }
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/");

  const profile = await ensureProfile(user);
  const tickets = await listUserTickets(user);

  return (
    <main>
      <PageHero eyebrow="Account" title={`Welcome${profile.display_name ? `, ${profile.display_name}` : ""}.`} lead="Manage your profile and review contact requests linked to your work email." />
      <section className="section alt">
        <div className="section-inner grid three">
          <article className="card">
            <span className="icon">P</span>
            <h3>Profile</h3>
            <p>Keep your organization and contact details up to date.</p>
            <div className="card-actions"><a className="button secondary" href="/account/profile/">Edit profile</a></div>
          </article>
          <article className="card">
            <span className="icon">T</span>
            <h3>Tickets</h3>
            <p>{tickets.length} contact request{tickets.length === 1 ? "" : "s"} linked to your account.</p>
            <div className="card-actions"><a className="button secondary" href="/account/tickets/">View tickets</a></div>
          </article>
          <article className="card">
            <span className="icon">C</span>
            <h3>Contact Aifar</h3>
            <p>Submit a new request using your account information.</p>
            <div className="card-actions"><a className="button primary" href="/contact/">New request</a></div>
          </article>
        </div>
      </section>
    </main>
  );
}
