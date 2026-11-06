import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { createClient } from "@supabase/supabase-js";
import siteAccess from "./lib/site-access.cjs";
import approval from "./lib/account-approval.cjs";

const intlMiddleware = createMiddleware(routing);

function sanitizeNextPath(value, locale) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/${locale}/account/`;
  }

  return value;
}

function getLocaleOAuthCallback(request) {
  const { pathname, searchParams } = request.nextUrl;
  const [, locale] = pathname.split("/");
  const hasLocale = routing.locales.includes(locale);
  const code = searchParams.get("code");

  if (!hasLocale || !code) {
    return null;
  }

  const callbackUrl = new URL("/api/auth/callback/", request.url);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("next", sanitizeNextPath(searchParams.get("next"), locale));
  return callbackUrl;
}

async function verifyToken(token) {
  const url = process.env.SUPABASE_AUTH_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(8000), cache: "no-store" }) }
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const authenticated = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(8000), cache: "no-store" })
    }
  });
  const { data: profile, error: profileError } = await authenticated
    .from("profiles").select("account_status").eq("id", data.user.id).single();
  return !profileError && approval.isApprovedProfile(profile) ? data.user : null;
}

function privateResponse(response) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export default async function middleware(request) {
  const callbackUrl = getLocaleOAuthCallback(request);

  if (callbackUrl) {
    return privateResponse(NextResponse.redirect(callbackUrl));
  }

  const { pathname } = request.nextUrl;
  const access = await siteAccess.canAccessSite(
    pathname, request.cookies.get("aifar_access_token")?.value, verifyToken
  );
  if (!access.allowed) {
    if (access.api || /\.[^/]+\/?$/.test(pathname)) {
      return privateResponse(NextResponse.json({ errorCode: "authentication_required" }, { status: 401 }));
    }
    const login = new URL(`/${access.locale}/login/`, request.url);
    return privateResponse(NextResponse.redirect(login));
  }
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || /\.[^/]+\/?$/.test(pathname)) {
    return privateResponse(NextResponse.next());
  }
  return privateResponse(intlMiddleware(request));
}

export const config = {
  matcher: ["/((?!_next/static/).*)"]
};
