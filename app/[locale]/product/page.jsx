import { setRequestLocale } from "next-intl/server";
import { SitePageSections } from "@/components/SitePageSections";
import { getPublishedSitePageContent } from "@/lib/site-content";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/product/";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const fallback = await getPageMessages(locale, "product");
  const page = await getPublishedSitePageContent("product", locale, fallback);
  return buildMetadata({
    locale,
    pathname,
    title: page.seo.title,
    description: page.seo.description,
    image: page.heroImagePath ? page.heroImageUrl : undefined
  });
}

export default async function ProductPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const fallback = await getPageMessages(locale, "product");
  const page = await getPublishedSitePageContent("product", locale, fallback);

  return (
    <main>
      <SitePageSections page={page} locale={locale} />
    </main>
  );
}
