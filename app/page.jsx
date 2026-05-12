import { Card } from "@/components/Card";
import { Release } from "@/components/Rows";

export const metadata = {
  title: "Aifar | Lightweight Standard Collaboration for Government and Enterprise Teams",
  description:
    "Aifar brings chat, meetings, email, contacts, documents, workflows, and forms into one lightweight collaboration workspace for government and enterprise teams.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Aifar Collaboration Platform",
    description: "Lightweight standard collaboration for government and enterprise teams.",
    type: "website",
    images: ["/assets/images/aifar-hero.png"]
  }
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aifar",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Windows, macOS, iOS, Android",
  description: "Lightweight standard collaboration software for government and enterprise teams.",
  featureList: ["Chat", "Meeting", "Email", "Contact", "Documents", "Workflow", "Forms"]
};

export default function HomePage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="hero">
        <div className="section-inner hero-grid">
          <div>
            <p className="eyebrow">Government and enterprise collaboration</p>
            <h1>Aifar</h1>
            <p className="lead">
              Lightweight standard collaboration for teams that need clear communication, structured work, and reliable access across desktop and mobile clients.
            </p>
            <div className="actions">
              <a className="button primary" href="/downloads/">
                Download Aifar
              </a>
              <a className="button secondary" href="/contact/">
                Contact Sales
              </a>
            </div>
          </div>
          <div className="hero-media">
            <img src="/assets/images/aifar-hero.png" alt="Aifar collaboration workspace preview showing desktop and mobile app screens" />
          </div>
        </div>
        <div className="section-inner trust-row" aria-label="Aifar platform highlights">
          <div>
            <strong>7</strong>
            <span>Core collaboration modules</span>
          </div>
          <div>
            <strong>5</strong>
            <span>Client families supported</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Support-ready site structure</span>
          </div>
          <div>
            <strong>SEO</strong>
            <span>Micro-lightweight, ready out of the box</span>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <div className="section-head">
            <h2>One workspace for standard collaboration</h2>
            <p>Aifar covers the daily collaboration layer without forcing teams into a heavy, fragmented toolset.</p>
          </div>
          <div className="grid four">
            <Card icon="C" title="Chat">Organized team messaging for departments, projects, and cross-agency collaboration.</Card>
            <Card icon="M" title="Meeting">Simple meeting access for distributed teams across desktop, phone, and tablet.</Card>
            <Card icon="E" title="Email">Integrated mail workflows that keep formal communication connected to work context.</Card>
            <Card icon="D" title="Documents">Centralized document access for policies, procedures, guides, and shared materials.</Card>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-head">
            <h2>Built for managed teams</h2>
            <p>The website is planned as the public entry point for product introduction, downloads, updates, documentation, and technical support.</p>
          </div>
          <div className="feature-list">
            <div className="feature">
              <h3>Cross-client access</h3>
              <p>PC, iOS, Android phone, Android pad, and Mac Preview are represented from the first release of the site.</p>
            </div>
            <div className="feature">
              <h3>Operational content</h3>
              <p>What's New, documentation, support, and download pages are separated so each area can be maintained independently.</p>
            </div>
            <div className="feature">
              <h3>Future Aifar integration</h3>
              <p>Contact forms, support requests, release notes, and documents can later connect to Aifar Forms, Workflow, Docs, Chat, Meeting, Email, and Contact.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <div className="section-head">
            <h2>Latest updates</h2>
            <a className="button secondary" href="/whats-new/">
              View all
            </a>
          </div>
          <div className="release-list">
            <Release title="Website foundation" description="Initial public website structure for product introduction, downloads, documentation, support, and contact." pill="Planning" />
            <Release title="Mac client preview" description="Download area includes a preview channel for the Mac client." pill="Preview" />
            <Release title="Docs hub prepared" description="Documentation entry points are ready for user guides, admin guides, deployment notes, and support policies." pill="Docs" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner cta-band">
          <p className="eyebrow">Ready for launch operations</p>
          <h2>Start with a clear website. Grow into a connected Aifar service portal.</h2>
          <p>The first version stays lightweight and deployable. Future versions can connect forms, workflows, documents, contact records, and support conversations directly to Aifar.</p>
          <div className="actions">
            <a className="button primary" href="/downloads/">
              Get Aifar
            </a>
            <a className="button secondary" href="/support/">
              Technical Support
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
