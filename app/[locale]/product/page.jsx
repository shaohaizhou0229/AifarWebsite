import { setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Card } from "@/components/Card";
import { PageHero } from "@/components/PageHero";
import { getPublishedSitePageContent } from "@/lib/site-content";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/product/";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  await connection();
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
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const fallback = await getPageMessages(locale, "product");
  const page = await getPublishedSitePageContent("product", locale, fallback);

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      {page.heroImagePath ? (
        <section className="section product-visual-section">
          <div className="section-inner">
            <div className="hero-media product-page-media">
              <img src={page.heroImageUrl} alt={page.heroAlt || page.title} />
            </div>
          </div>
        </section>
      ) : null}
      <section className="section alt">
        <div className="section-inner">
          <div className="grid three">
            {page.features.map(([icon, title, description]) => (
              <Card key={title} icon={icon} title={title}>{description}</Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
