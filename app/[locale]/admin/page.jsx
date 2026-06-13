import { setRequestLocale } from "next-intl/server";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminPageHeader } from "@/components/AdminShell";
import { getLocaleMessages, getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/";

export const dynamic = "force-dynamic";

function safeRange(value) {
  return Number(value) === 1 ? 1 : 7;
}

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
  const trafficRangeDays = query?.trafficRange ? safeRange(query.trafficRange) : safeRange(query?.range);
  const downloadRangeDays = query?.downloadRange ? safeRange(query.downloadRange) : 7;

  return (
    <>
      <AdminPageHeader
        locale={locale}
        shell={page.shell}
        title={page.title}
        lead={page.lead}
        breadcrumbs={[
          { label: page.title }
        ]}
      />
      <AdminDashboardClient
        key={`${trafficRangeDays}-${downloadRangeDays}`}
        locale={locale}
        page={page}
        trafficRangeDays={trafficRangeDays}
        downloadRangeDays={downloadRangeDays}
        loadingLabel={messages.forms.common.pleaseWait}
        errorLabel={messages.forms.siteContent.loadFailed}
      />
    </>
  );
}
