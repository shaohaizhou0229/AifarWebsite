import { PageHero } from "@/components/PageHero";
import { DownloadRow } from "@/components/Rows";

export const metadata = {
  title: "Downloads | Aifar",
  description: "Download Aifar for PC, iOS, Android phone, Android pad, and Mac Preview.",
  alternates: { canonical: "/downloads/" }
};

export default function DownloadsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Downloads"
        title="Get Aifar on the devices your teams already use."
        lead="Download links are placeholders for the first website skeleton and can be connected to release storage or Aifar-managed version records later."
      />
      <section className="section alt">
        <div className="section-inner">
          <div className="download-list">
            <DownloadRow title="PC Client" description="Windows desktop client for daily collaboration." action="Download" variant="primary" />
            <DownloadRow title="iOS Client" description="Mobile access for iPhone and iPad users." action="App Store" />
            <DownloadRow title="Android Phone" description="Android client optimized for phone screens." action="Download APK" />
            <DownloadRow title="Android Pad" description="Tablet-ready Android collaboration experience." action="Download APK" />
            <DownloadRow title="Mac Client" description="Current channel: preview version." action="Preview" />
          </div>
        </div>
      </section>
    </main>
  );
}
