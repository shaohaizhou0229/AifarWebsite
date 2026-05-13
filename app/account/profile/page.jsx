import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profiles";

export const metadata = {
  title: "Profile | Aifar",
  description: "Update your Aifar account profile.",
  alternates: { canonical: "/account/profile/" }
};

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/");

  const profile = await ensureProfile(user);

  return (
    <main>
      <PageHero eyebrow="Profile" title="Manage your profile." lead="These details help Aifar support and sales teams understand your organization context." />
      <section className="section alt">
        <div className="section-inner">
          <ProfileForm profile={profile} />
        </div>
      </section>
    </main>
  );
}
