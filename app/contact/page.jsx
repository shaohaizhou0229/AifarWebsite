import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";

export const metadata = {
  title: "Contact | Aifar",
  description: "Contact Aifar for government and enterprise collaboration product inquiries, technical support, and partnership discussions.",
  alternates: { canonical: "/contact/" }
};

export default async function ContactPage() {
  const user = await getCurrentUser();
  const profile = user?.id ? await getProfile(user.id) : null;
  const initialData = user ? {
    name: profile?.display_name || "",
    workEmail: user.email || "",
    organization: profile?.organization || ""
  } : {};

  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title="Talk with the Aifar team."
        lead="Use this placeholder form for the first website version. Later it can submit directly into Aifar Forms, Workflow, Contact, and Email."
      />
      <section className="section alt">
        <div className="section-inner">
          <ContactForm initialData={initialData} isLoggedIn={Boolean(user)} />
        </div>
      </section>
    </main>
  );
}
