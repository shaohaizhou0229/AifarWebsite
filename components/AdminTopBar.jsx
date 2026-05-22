import Link from "next/link";
import { Bell, ChevronDown, Home, Plus } from "lucide-react";
import { AdminAutoCloseDetails } from "@/components/AdminAutoCloseDetails";
import { AdminLanguageMenu } from "@/components/AdminLanguageMenu";
import { AdminTopBarTitle } from "@/components/AdminTopBarTitle";
import { localizedPath } from "@/i18n/routing";

export function AdminTopBar({ locale, labels = {}, title = "" }) {
  const actionLabels = labels.actions || {};

  return (
    <div className="admin-topbar">
      <AdminTopBarTitle fallbackTitle={title} projectName={labels.projectName || "Aifar Website"} rootHref={localizedPath(locale, "/admin/")} />
      <div className="admin-topbar-actions">
        <Link className="admin-icon-button" href={localizedPath(locale, "/admin/notifications/")} prefetch={false} aria-label={labels.adminNotifications || labels.notifications || "Notifications"}>
          <Bell aria-hidden="true" size={17} strokeWidth={1.8} />
          <span className="admin-notification-dot" />
        </Link>
        <AdminLanguageMenu locale={locale} label={labels.language || "Language"} />
        <Link className="admin-frontsite-link" href={localizedPath(locale, "/")} prefetch={false} aria-label={labels.frontSite || "Return to website"}>
          <Home aria-hidden="true" size={15} strokeWidth={1.8} />
          <span>{labels.frontSiteShort || labels.frontSite || "Website"}</span>
        </Link>
        <AdminAutoCloseDetails
          className="admin-action-menu"
          summary={(
            <>
            <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>{actionLabels.newAction || "New"}</span>
            <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
            </>
          )}
        >
          <div className="admin-action-menu-list">
            <Link href={localizedPath(locale, "/admin/users/")} prefetch={false}>{actionLabels.inviteUser || "Invite user"}</Link>
            <Link href={localizedPath(locale, "/admin/docs/new/")} prefetch={false}>{actionLabels.newDocument || "New document"}</Link>
            <Link href={localizedPath(locale, "/admin/downloads/")} prefetch={false}>{actionLabels.publishClient || actionLabels.manageDownloads || "Publish client"}</Link>
            <Link href={localizedPath(locale, "/admin/collaboration/")} prefetch={false}>{actionLabels.createSpace || "Create space"}</Link>
          </div>
        </AdminAutoCloseDetails>
      </div>
    </div>
  );
}
