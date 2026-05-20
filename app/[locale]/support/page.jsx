import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/support/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "support");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function SupportPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`${localizedPath(locale, "/contact/")}?type=technical_support`);
}
