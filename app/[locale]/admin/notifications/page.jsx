import { setRequestLocale } from "next-intl/server";
import { AdminNotificationsClient } from "@/components/AdminNotificationsClient";
import { AdminPageHeader } from "@/components/AdminShell";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/notifications/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminNotifications");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminNotificationsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, shellPage, messages] = await Promise.all([
    getPageMessages(locale, "adminNotifications"),
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);

  return (
    <>
      <AdminPageHeader
        locale={locale}
        shell={shellPage.shell}
        title={page.title}
        lead={page.lead}
      />
      <AdminNotificationsClient
        locale={locale}
        labels={page}
        loadingLabel={messages.forms.common.pleaseWait}
        errorLabel={page.loadFailed}
      />
    </>
  );
}
