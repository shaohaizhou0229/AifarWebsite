import { setRequestLocale } from "next-intl/server";
import { DownloadRow } from "@/components/Rows";
import { PageHero } from "@/components/PageHero";
import { formatFileSize, listPublicDownloadPlatforms } from "@/lib/downloads";
import { getPageMessages } from "@/i18n/messages";
import { buildMetadata } from "@/i18n/seo";

const pathname = "/downloads/";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPageMessages(locale, "downloads");
  return buildMetadata({ locale, pathname, title: page.seo.title, description: page.seo.description });
}

export default async function DownloadsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageMessages(locale, "downloads");
  const platforms = await listPublicDownloadPlatforms();

  return (
    <main>
      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section className="section alt">
        <div className="section-inner">
          <div className="download-list">
            {platforms.map((platform) => {
              const release = platform.release;
              const isAvailable = release.isPublished && (release.externalUrl || release.storagePath);
              const versionMeta = release.version
                ? `${page.versionLabel} ${release.version}${release.fileSize ? ` - ${formatFileSize(release.fileSize)}` : ""}`
                : "";
              const description = release.releaseNotes || platform.description;

              return (
                <DownloadRow
                  key={platform.key}
                  title={platform.title}
                  description={description}
                  action={isAvailable ? platform.action : page.comingSoon}
                  variant={platform.variant}
                  href={`/api/downloads/${platform.key}/`}
                  disabled={!isAvailable}
                  meta={versionMeta}
                  checksum={release.checksumSha256}
                />
              );
            })}
            {!platforms.length ? page.items.map(([title, description, action, variant]) => (
              <DownloadRow key={title} title={title} description={description} action={action} variant={variant} disabled />
            )) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
