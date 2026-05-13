import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForms";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Register | Aifar",
  description: "Create an Aifar account to manage your profile and contact requests.",
  alternates: { canonical: "/register/" }
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/");

  return (
    <main>
      <PageHero eyebrow="Account" title="Create your Aifar account." lead="Use your work email to connect future and historical contact requests." />
      <section className="section alt">
        <div className="section-inner">
          <AuthForm mode="register" />
        </div>
      </section>
    </main>
  );
}
