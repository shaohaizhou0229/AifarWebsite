import { NextResponse } from "next/server";
import { requestAccountEmailChange } from "@/lib/account-security";
import { AccountInactiveError, AuthConfigurationError, AuthRequiredError, setAuthCookies } from "@/lib/auth";
import coreRules from "@/lib/core-rules.cjs";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function getRequestOrigin(request) {
  const configuredOrigin = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");

  const fallbackUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const proto = forwardedProto || fallbackUrl.protocol.replace(":", "") || "https";
  return host ? `${proto}://${host}` : fallbackUrl.origin;
}

function sanitizeRedirectPath(value) {
  if (!value || typeof value !== "string") return "/zh-CN/account/profile/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/zh-CN/account/profile/";
  return value;
}

function buildEmailRedirectTo(request, redirectPath) {
  const callbackUrl = new URL("/api/auth/callback/", getRequestOrigin(request));
  callbackUrl.searchParams.set("next", sanitizeRedirectPath(redirectPath));
  return callbackUrl.toString();
}

function securityError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ errorCode: "auth_required" }, { status: 401 });
  }
  if (error instanceof AccountInactiveError) {
    return NextResponse.json({ errorCode: "account_inactive" }, { status: 403 });
  }
  if (error instanceof AuthConfigurationError) {
    return NextResponse.json({ errorCode: "auth_service_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ errorCode: error.code || "email_change_failed" }, { status: 400 });
}

export async function PATCH(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const { email } = coreRules.normalizeAccountEmailInput(payload);
    const context = await requestAccountEmailChange({
      email,
      redirectTo: buildEmailRedirectTo(request, payload.redirectPath)
    });

    await recordUserFootprint({
      userId: context.user.id,
      actorUserId: context.user.id,
      eventType: USER_FOOTPRINT_EVENTS.emailChangeRequested,
      summary: "User requested an account email change.",
      relatedType: "profile",
      relatedId: context.user.id,
      metadata: { email }
    });

    const response = NextResponse.json({
      ok: true,
      security: context.security
    });
    setAuthCookies(response, context.session);
    return response;
  } catch (error) {
    return securityError(error);
  }
}
