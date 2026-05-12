import { Card } from "@/components/Card";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Security | Aifar",
  description: "Aifar security and compliance overview for government and enterprise collaboration environments.",
  alternates: { canonical: "/security/" }
};

export default function SecurityPage() {
  return (
    <main>
      <PageHero
        eyebrow="Security"
        title="Designed for managed collaboration environments."
        lead="This page gives Aifar a dedicated place for security, privacy, governance, and deployment messaging as the product documentation matures."
      />
      <section className="section alt">
        <div className="section-inner">
          <div className="grid three">
            <Card icon="G" title="Governance">Clear ownership, structured communication, and maintainable content for enterprise operations.</Card>
            <Card icon="P" title="Privacy">Prepared space for privacy policies, data handling, retention, and customer-specific terms.</Card>
            <Card icon="D" title="Deployment">Ready for deployment notes, client update policy, and environment-specific documentation.</Card>
          </div>
        </div>
      </section>
    </main>
  );
}
