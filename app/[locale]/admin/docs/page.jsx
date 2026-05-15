import { setRequestLocale } from "next-intl/server";
import { AdminPlaceholderPage } from "@/components/AdminPlaceholderPage";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/admin/docs/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "adminDocs");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function AdminDocsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [page, adminHome] = await Promise.all([
    getPageMessages(locale, "adminDocs"),
    getPageMessages(locale, "adminHome")
  ]);
  return <AdminPlaceholderPage locale={locale} page={page} nav={adminHome.nav} sectionKey="docs" />;
}

