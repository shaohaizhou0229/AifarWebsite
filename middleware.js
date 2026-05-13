import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function getLocaleHomeCallback(request) {
  const { pathname, searchParams } = request.nextUrl;
  const [, locale, rest] = pathname.split("/");
  const isLocaleHome = routing.locales.includes(locale) && (!rest || rest === "");
  const code = searchParams.get("code");

  if (!isLocaleHome || !code) {
    return null;
  }

  const callbackUrl = new URL("/api/auth/callback/", request.url);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("next", `/${locale}/account/`);
  return callbackUrl;
}

export default function middleware(request) {
  const callbackUrl = getLocaleHomeCallback(request);

  if (callbackUrl) {
    return NextResponse.redirect(callbackUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};
