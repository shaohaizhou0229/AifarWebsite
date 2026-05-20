"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActiveNavLink } from "@/components/ActiveNavLink";
import { SignOutButton } from "@/components/SignOutButton";
import { clearSiteSessionCache, createSiteSession, readSiteSessionCache, writeSiteSessionCache } from "@/components/site-session-cache";
import { localizedPath } from "@/i18n/routing";

function isProfileActive(profile) {
  return !profile || !profile.accountStatus || profile.accountStatus === "active";
}

function isAccountPath(pathname, locale) {
  return pathname === `/${locale}/account/` || pathname?.startsWith(`/${locale}/account/`);
}

function isAuthPath(pathname, locale) {
  return pathname === `/${locale}/login/` || pathname === `/${locale}/register/`;
}

export function SiteSessionNav({ locale, nav, authLabels }) {
  const pathname = usePathname();
  const isAdminPath = pathname === `/${locale}/admin/` || pathname?.startsWith(`/${locale}/admin/`);
  const [session, setSession] = useState(() => (
    isAccountPath(pathname, locale) && !isAuthPath(pathname, locale) ? { user: { id: "account-page" }, profile: null, unreadCount: 0 } : { user: null, profile: null, unreadCount: 0 }
  ));

  useEffect(() => {
    if (isAdminPath) return undefined;
    if (isAuthPath(pathname, locale)) {
      clearSiteSessionCache();
      setSession({ user: null, profile: null, unreadCount: 0 });
      return undefined;
    }

    const controller = new AbortController();
    const cachedSession = readSiteSessionCache();
    if (cachedSession) {
      setSession(cachedSession);
    } else if (isAccountPath(pathname, locale)) {
      setSession((current) => current.user ? current : { user: { id: "account-page" }, profile: null, unreadCount: 0 });
    }

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
        const nextSession = active ? createSiteSession(result) : null;

        if (controller.signal.aborted) return;
        if (nextSession) {
          writeSiteSessionCache(nextSession);
          setSession(nextSession);
        } else {
          clearSiteSessionCache();
          setSession({ user: null, profile: null, unreadCount: 0 });
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          clearSiteSessionCache();
          setSession({ user: null, profile: null, unreadCount: 0 });
        }
      }
    }

    loadSession();
    return () => controller.abort();
  }, [isAdminPath, locale, pathname]);

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
