"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActiveNavLink } from "@/components/ActiveNavLink";
import { SignOutButton } from "@/components/SignOutButton";
import { localizedPath } from "@/i18n/routing";

function isProfileActive(profile) {
  return !profile || !profile.accountStatus || profile.accountStatus === "active";
}

function countUnread(notifications = []) {
  return notifications.filter((notification) => !notification.readAt).length;
}

export function SiteSessionNav({ locale, nav, authLabels }) {
  const pathname = usePathname();
  const isAdminPath = pathname === `/${locale}/admin/` || pathname?.startsWith(`/${locale}/admin/`);
  const [session, setSession] = useState({ user: null, profile: null, unreadCount: 0 });

  useEffect(() => {
    if (isAdminPath) return undefined;

    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me/", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Unable to load session.");

        const result = await response.json();
        const active = result.user && isProfileActive(result.profile);
        let unreadCount = 0;

        if (active) {
          const notificationsResponse = await fetch("/api/notifications/?limit=100", {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal
          }).catch(() => null);
          if (notificationsResponse?.ok) {
            const notificationsResult = await notificationsResponse.json();
            unreadCount = countUnread(notificationsResult.notifications || []);
          }
        }

        if (controller.signal.aborted) return;
        setSession({
          user: active ? result.user : null,
          profile: active ? result.profile : null,
          unreadCount
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          setSession({ user: null, profile: null, unreadCount: 0 });
        }
      }
    }

    loadSession();
    return () => controller.abort();
  }, [isAdminPath]);

  if (isAdminPath) return null;

  const { user, profile, unreadCount } = session;

  if (!user) {
    return (
      <ActiveNavLink className="nav-login-link" href={localizedPath(locale, "/login/")} activePaths={["/login/", "/register/"]}>
        {nav.signIn}
      </ActiveNavLink>
    );
  }

  return (
    <>
      {profile?.role === "admin" ? (
        <ActiveNavLink className="nav-admin-link" href={localizedPath(locale, "/admin/")} activePaths={["/admin/"]}>
          {nav.admin}
        </ActiveNavLink>
      ) : null}
      <ActiveNavLink
        className="nav-account-link"
        href={localizedPath(locale, "/account/")}
        exactActivePaths={["/account/"]}
        activePaths={["/account/profile/", "/account/tickets/"]}
      >
        {nav.account}
      </ActiveNavLink>
      <ActiveNavLink className="nav-account-link" href={localizedPath(locale, "/account/notifications/")} activePaths={["/account/notifications/"]}>
        {nav.notifications}{unreadCount ? ` (${unreadCount})` : ""}
      </ActiveNavLink>
      <SignOutButton labels={authLabels} redirectTo={localizedPath(locale, "/")} />
    </>
  );
}
