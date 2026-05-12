import { PageHero } from "@/components/PageHero";
import { Release } from "@/components/Rows";

export const metadata = {
  title: "What's New | Aifar",
  description: "Read Aifar release notes, product updates, client changes, and documentation announcements.",
  alternates: { canonical: "/whats-new/" }
};

export default function WhatsNewPage() {
  return (
    <main>
      <PageHero eyebrow="What's New" title="Product updates and release notes." lead="Use this area to publish release highlights, client updates, fixes, and operational announcements." />
      <section className="section alt">
        <div className="section-inner">
          <div className="release-list">
            <Release title="May 2026 Website foundation" description="Initial public website structure prepared for Aifar launch content." pill="Website" />
            <Release title="Mac Preview channel" description="The downloads page includes a dedicated Mac Preview entry for early client availability." pill="Client" />
            <Release title="Documentation hub" description="Docs entry points are ready for product, administrator, deployment, and security materials." pill="Docs" />
          </div>
        </div>
      </section>
    </main>
  );
}
