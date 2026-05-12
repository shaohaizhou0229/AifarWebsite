import { Card } from "@/components/Card";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Product | Aifar",
  description: "Explore Aifar features including chat, meeting, email, contact, documents, workflow, and forms.",
  alternates: { canonical: "/product/" }
};

const features = [
  ["C", "Chat", "Team channels, direct communication, and persistent work context."],
  ["M", "Meeting", "Meeting access for cross-location teams on desktop and mobile clients."],
  ["E", "Email", "Formal communication connected to contacts, documents, and work records."],
  ["P", "Contact", "Organized people and organization records for enterprise communication."],
  ["D", "Documents", "Guides, policies, project materials, and shared resources in one place."],
  ["W", "Workflow", "Structured approvals and operational flows for managed teams."],
  ["F", "Forms", "Simple data collection for contact requests, support, and internal processes."]
];

export default function ProductPage() {
  return (
    <main>
      <PageHero eyebrow="Product" title="Standard collaboration without unnecessary complexity." lead="Aifar combines communication, structured work, and business records into one lightweight workspace." />
      <section className="section alt">
        <div className="section-inner">
          <div className="grid three">
            {features.map(([icon, title, description]) => (
              <Card key={title} icon={icon} title={title}>
                {description}
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
