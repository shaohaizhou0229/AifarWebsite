import { NextResponse } from "next/server";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { exchangeOAuthCode, setAuthCookies } from "@/lib/auth";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function sanitizeRedirectPath(value) {
  if (!value || typeof value !== "string") return "/en/account/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/en/account/";
  return value;
}

function loginPathFromNext(nextPath) {
  const locale = nextPath.split("/").filter(Boolean)[0] || "en";
  return `/${locale}/login/`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = sanitizeRedirectPath(url.searchParams.get("next"));

  if (!code) {
    const responseUrl = new URL(loginPathFromNext(nextPath), request.url);
    responseUrl.searchParams.set("error", "auth_missing_code");
    return NextResponse.redirect(responseUrl);
  }

  try {
    const result = await exchangeOAuthCode(request, code);
    const user = result.session.user;

    if (user?.id) {
      const profile = await ensureProfile(user, {
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || null
      });
      if (!isProfileActive(profile)) {
        const responseUrl = new URL(loginPathFromNext(nextPath), request.url);
        responseUrl.searchParams.set("error", "account_inactive");
        return NextResponse.redirect(responseUrl);
      }
      await recordUserFootprint({
        userId: user.id,
        actorUserId: user.id,
        eventType: USER_FOOTPRINT_EVENTS.oauthLoggedIn,
        summary: "User completed an authentication callback."
      });
    }

    const response = NextResponse.redirect(new URL(nextPath, request.url));

    result.cookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    setAuthCookies(response, result.session);

    return response;
  } catch (error) {
    const responseUrl = new URL(loginPathFromNext(nextPath), request.url);
    responseUrl.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(responseUrl);
  }
}
