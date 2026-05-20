import { Bell, ChevronDown, Plus } from "lucide-react";
import { AdminLanguageMenu } from "@/components/AdminLanguageMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { localizedPath } from "@/i18n/routing";

export function AdminTopBar({ locale, labels = {}, title = "", user = null }) {
  const actionLabels = labels.actions || {};

  return (
    <div className="admin-topbar">
      <div className="admin-topbar-side" aria-hidden="true" />
      <div className="admin-topbar-title">
        <strong>{title}</strong>
      </div>
      <div className="admin-topbar-actions">
        <a className="admin-icon-button" href={localizedPath(locale, "/account/notifications/")} aria-label={labels.notifications || "Notifications"}>
          <Bell aria-hidden="true" size={17} strokeWidth={1.8} />
          <span className="admin-notification-dot" />
        </a>
        <AdminLanguageMenu locale={locale} label={labels.language || "Language"} />
        <a className="admin-avatar-link" href={localizedPath(locale, "/account/")} aria-label={labels.account || "Account"}>
          {user?.initials || "A"}
        </a>
        <details className="admin-action-menu">
          <summary>
            <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>{actionLabels.newAction || "New action"}</span>
            <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
          </summary>
          <div className="admin-action-menu-list">
            <a href={localizedPath(locale, "/admin/users/")}>{actionLabels.inviteUser || "Invite user"}</a>
            <a href={localizedPath(locale, "/admin/docs/new/")}>{actionLabels.newDocument || "New document"}</a>
            <a href={localizedPath(locale, "/admin/downloads/")}>{actionLabels.manageDownloads || "Manage downloads"}</a>
            <SignOutButton labels={labels.auth || { signOut: "Sign out", signingOut: "Signing out..." }} redirectTo={localizedPath(locale, "/")} />
          </div>
        </details>
      </div>
    </div>
  );
}
