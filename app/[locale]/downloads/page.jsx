import { setRequestLocale } from "next-intl/server";
import { DownloadRow } from "@/components/Rows";
import { PageHero } from "@/components/PageHero";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/downloads/";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "downloads");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function DownloadsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "downloads");

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="download-list">
            {page.items.map(([title, description, action, variant]) => (
              <DownloadRow key={title} title={title} description={description} action={action} variant={variant} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
