import { PageHero } from "@/components/PageHero";
import { DocLink } from "@/components/Rows";

export const metadata = {
  title: "Documentation | Aifar",
  description: "Aifar documentation hub for user guides, admin guides, deployment notes, security, and support policies.",
  alternates: { canonical: "/docs/" }
};

export default function DocsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Documentation"
        title="Guides for users, administrators, and support teams."
        lead="The docs hub is ready for product materials and can later be backed by Aifar Docs or another content system."
      />
      <section className="section alt">
        <div className="section-inner">
          <div className="doc-list">
            <DocLink title="Getting Started" description="Core concepts, account access, and first-use checklist." pill="User guide" />
            <DocLink title="Client Installation" description="Install and update Aifar across PC, iOS, Android, and Mac Preview." pill="Setup" />
            <DocLink title="Administrator Guide" description="Team structure, access management, contacts, and operational governance." pill="Admin" />
            <DocLink title="Security Overview" description="Security posture, privacy handling, and enterprise deployment notes." pill="Security" />
          </div>
        </div>
      </section>
    </main>
  );
}
