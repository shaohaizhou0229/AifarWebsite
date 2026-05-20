import { setRequestLocale } from "next-intl/server";
import { SitePageSections } from "@/components/SitePageSections";
import { getPublishedSitePageContent } from "@/lib/site-content";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const fallback = await getPageMessages(locale, "home");
  const page = await getPublishedSitePageContent("home", locale, fallback);
  return buildMetadata({
    locale,
    pathname,
    title: page.seo.title,
    description: page.seo.description,
    image: page.heroImageUrl || "/assets/images/aifar-hero.png"
  });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const fallback = await getPageMessages(locale, "home");
  const page = await getPublishedSitePageContent("home", locale, fallback);
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Aifar",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, iOS, Android",
    description: page.schemaDescription,
    featureList: ["Chat", "Meeting", "Email", "Contact", "Documents", "Workflow", "Forms"]
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SitePageSections page={page} locale={locale} />
    </main>
  );
}
