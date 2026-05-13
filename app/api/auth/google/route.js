import { NextResponse } from "next/server";
import { startGoogleOAuth } from "@/lib/auth";

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

function getRequestOrigin(request) {
  const fallbackUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const proto = forwardedProto || fallbackUrl.protocol.replace(":", "") || "https";

  return host ? `${proto}://${host}` : fallbackUrl.origin;
}

export async function GET(request) {
  const url = new URL(request.url);
  const nextPath = sanitizeRedirectPath(url.searchParams.get("next"));

  try {
    const callbackUrl = new URL("/api/auth/callback/", getRequestOrigin(request));
    callbackUrl.searchParams.set("next", nextPath);

    const result = await startGoogleOAuth(request, callbackUrl.toString());
    const response = NextResponse.redirect(result.url);

    result.cookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch (error) {
    const responseUrl = new URL(loginPathFromNext(nextPath), request.url);
    responseUrl.searchParams.set("error", error.message || "Google sign in failed.");
    return NextResponse.redirect(responseUrl);
  }
}
