import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { MarkAllNotificationsRead, NotificationActions } from "@/components/NotificationActions";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { listNotifications } from "@/lib/notifications";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/account/notifications/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "notifications");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

function formatDate(value, locale) {
  return value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function AccountNotificationsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizedPath(locale, "/login/"));

  const [page, profile, notifications] = await Promise.all([
    getPageMessages(locale, "notifications"),
    ensureProfile(user),
    listNotifications(user.id)
  ]);
  if (!isProfileActive(profile)) redirect(localizedPath(locale, "/login/"));

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <MarkAllNotificationsRead labels={page.actions} />
          <div className="release-list">
            {notifications.length ? notifications.map((notification) => (
              <article className="release" key={notification.id}>
                <div>
                  <span className="pill">{notification.readAt ? page.read : page.unread}</span>
                  <h3>{notification.title}</h3>
                  <p>{notification.body}</p>
                  <p className="muted-line">{formatDate(notification.createdAt, locale)}</p>
                </div>
                <NotificationActions
                  notificationId={notification.id}
                  labels={page.actions}
                  url={notification.url}
                  isAlreadyRead={Boolean(notification.readAt)}
                />
              </article>
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
