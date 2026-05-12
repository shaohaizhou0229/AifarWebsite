import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Contact | Aifar",
  description: "Contact Aifar for government and enterprise collaboration product inquiries, technical support, and partnership discussions.",
  alternates: { canonical: "/contact/" }
};

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title="Talk with the Aifar team."
        lead="Use this placeholder form for the first website version. Later it can submit directly into Aifar Forms, Workflow, Contact, and Email."
      />
      <section className="section alt">
        <div className="section-inner">
          <form className="form-shell">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" type="email" autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="organization">Organization</label>
              <input id="organization" name="organization" autoComplete="organization" />
            </div>
            <div className="field">
              <label htmlFor="request-type">Request type</label>
              <select id="request-type" name="request-type">
                <option>Product inquiry</option>
                <option>Technical support</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" />
            </div>
            <button className="button primary" type="button">
              Submit request
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
