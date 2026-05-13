import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForms";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Sign in | Aifar",
  description: "Sign in to your Aifar account to manage your profile and support tickets.",
  alternates: { canonical: "/login/" }
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/");

  return (
    <main>
      <PageHero eyebrow="Account" title="Sign in to Aifar." lead="Access your profile and view contact requests associated with your work email." />
      <section className="section alt">
        <div className="section-inner">
          <AuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}
