import Link from "next/link";
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
        <Link className="admin-icon-button" href={localizedPath(locale, "/account/notifications/")} prefetch={false} aria-label={labels.notifications || "Notifications"}>
          <Bell aria-hidden="true" size={17} strokeWidth={1.8} />
          <span className="admin-notification-dot" />
        </Link>
        <AdminLanguageMenu locale={locale} label={labels.language || "Language"} />
        <Link className="admin-avatar-link" href={localizedPath(locale, "/account/")} prefetch={false} aria-label={labels.account || "Account"}>
          {user?.initials || "A"}
        </Link>
        <details className="admin-action-menu">
          <summary>
            <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>{actionLabels.newAction || "New action"}</span>
            <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
          </summary>
          <div className="admin-action-menu-list">
            <Link href={localizedPath(locale, "/admin/users/")} prefetch={false}>{actionLabels.inviteUser || "Invite user"}</Link>
            <Link href={localizedPath(locale, "/admin/docs/new/")} prefetch={false}>{actionLabels.newDocument || "New document"}</Link>
            <Link href={localizedPath(locale, "/admin/downloads/")} prefetch={false}>{actionLabels.manageDownloads || "Manage downloads"}</Link>
            <SignOutButton labels={labels.auth || { signOut: "Sign out", signingOut: "Signing out..." }} redirectTo={localizedPath(locale, "/")} />
          </div>
        </details>
      </div>
    </div>
  );
}
