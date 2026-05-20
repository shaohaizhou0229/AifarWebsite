import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { localizedPath } from "@/i18n/routing";

export function AdminTopBar({ locale, labels = {}, title = "" }) {
  return (
    <div className="admin-topbar">
      <div>
        <span className="admin-topbar-kicker">{labels.workspace || "Workspace"}</span>
        <strong>{title}</strong>
      </div>
      <div className="admin-topbar-actions">
        <a href={localizedPath(locale, "/account/notifications/")}>{labels.notifications || "Notifications"}</a>
        <a href={localizedPath(locale, "/account/")}>{labels.account || "Account"}</a>
        <LanguageSwitcher locale={locale} label={labels.language || "Language"} />
        <SignOutButton labels={labels.auth || { signOut: "Sign out", signingOut: "Signing out..." }} redirectTo={localizedPath(locale, "/")} />
      </div>
    </div>
  );
}
