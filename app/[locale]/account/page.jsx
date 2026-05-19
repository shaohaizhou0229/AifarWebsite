import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { countUnreadNotifications } from "@/lib/notifications";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { listUserTickets } from "@/lib/tickets";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";
import { formatMessage } from "@/i18n/labels";

const pathname = "/account/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "account");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AccountPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizedPath(locale, "/login/"));

  const [page, profile, tickets, unreadNotifications] = await Promise.all([
    getPageMessages(locale, "account"),
    ensureProfile(user),
    listUserTickets(user),
    countUnreadNotifications(user.id)
  ]);
  const cards = page.cards;
  const ticketsText = formatMessage(cards.ticketsText, { count: tickets.length });
  if (!isProfileActive(profile)) redirect(localizedPath(locale, "/login/"));

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={`${page.welcome}${profile.display_name ? `, ${profile.display_name}` : ""}.`} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner grid three">
          <article className="card">
            <span className="icon">P</span>
            <h3>{cards.profileTitle}</h3>
            <p>{cards.profileText}</p>
            <div className="card-actions"><a className="button secondary" href={localizedPath(locale, "/account/profile/")}>{cards.profileAction}</a></div>
          </article>
          <article className="card">
            <span className="icon">T</span>
            <h3>{cards.ticketsTitle}</h3>
            <p>{ticketsText}</p>
            <div className="card-actions"><a className="button secondary" href={localizedPath(locale, "/account/tickets/")}>{cards.ticketsAction}</a></div>
          </article>
          <article className="card">
            <span className="icon">C</span>
            <h3>{cards.contactTitle}</h3>
            <p>{cards.contactText}</p>
            <div className="card-actions"><a className="button primary" href={localizedPath(locale, "/contact/")}>{cards.contactAction}</a></div>
          </article>
          <article className="card">
            <span className="icon">N</span>
            <h3>{cards.notificationsTitle}</h3>
            <p>{formatMessage(cards.notificationsText, { count: unreadNotifications })}</p>
            <div className="card-actions"><a className="button secondary" href={localizedPath(locale, "/account/notifications/")}>{cards.notificationsAction}</a></div>
          </article>
        </div>
      </section>
    </main>
  );
}
