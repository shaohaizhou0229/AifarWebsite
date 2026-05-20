import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPageMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/security/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "security");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function SecurityPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`${localizedPath(locale, "/product/")}#security`);
}
