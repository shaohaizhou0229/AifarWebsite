import { setRequestLocale } from "next-intl/server";
import { AdminPlaceholderPage } from "@/components/AdminPlaceholderPage";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/support/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminSupport");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminSupportPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminSupport"),
    getPageMessages(locale, "adminHome")
  ]);
  return <AdminPlaceholderPage locale={locale} page={page} nav={adminHome.nav} sectionKey="support" />;
}

