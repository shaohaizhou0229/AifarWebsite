import { Card } from "@/components/Card";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Support | Aifar",
  description: "Get technical support for Aifar products, clients, documentation, deployment, and account access.",
  alternates: { canonical: "/support/" }
};

export default function SupportPage() {
  return (
    <main>
      <PageHero eyebrow="Support" title="Technical support for Aifar teams." lead="This page is prepared for account, client, deployment, and product support workflows." />
      <section className="section alt">
        <div className="section-inner">
          <div className="grid three">
            <Card icon="A" title="Account Access">Help with login, organization access, and account readiness.</Card>
            <Card icon="I" title="Installation">Client setup guidance for desktop and mobile users.</Card>
            <Card icon="T" title="Technical Issue">Structured support requests can later route through Aifar Forms and Workflow.</Card>
          </div>
        </div>
      </section>
    </main>
  );
}
