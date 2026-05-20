import { setRequestLocale } from "next-intl/server";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminPageHeader } from "@/components/AdminShell";
import { getAdminShellContext } from "@/lib/admin-context";
import { getAdminDashboardOverview } from "@/lib/admin-dashboard";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminHome");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminHomePage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, messages] = await Promise.all([
    getPageMessages(locale, "adminHome"),
    getLocaleMessages(locale)
  ]);
  const query = await searchParams;
  const rangeDays = [1, 7, 30].includes(Number(query?.range)) ? Number(query.range) : 7;
  const context = await getAdminShellContext();
  const initialDashboard = await getAdminDashboardOverview({ userId: context.user.id, analyticsDays: rangeDays });

  return (
    <>
      <AdminPageHeader
      locale={locale}
      shell={page.shell}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.lead}
    />
      <AdminDashboardClient key={rangeDays} locale={locale} page={page} rangeDays={rangeDays} initialDashboard={initialDashboard} loadingLabel={messages.forms.common.pleaseWait} errorLabel={messages.forms.siteContent.loadFailed} />
    </>
  );
}
