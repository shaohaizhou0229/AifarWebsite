import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

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

export default function middleware(request) {
  const callbackUrl = getLocaleOAuthCallback(request);

  if (callbackUrl) {
    return NextResponse.redirect(callbackUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};
