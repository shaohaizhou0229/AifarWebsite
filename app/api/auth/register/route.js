import { NextResponse } from "next/server";
import { ensureProfile, isProfileActive } from "@/lib/profiles";
import { AuthConfigurationError, clearAuthCookies, setAuthCookies, signUpWithPassword } from "@/lib/auth";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

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
  if (!value || typeof value !== "string") return "/zh-CN/account/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/zh-CN/account/";
  return value;
}

function buildEmailRedirectTo(request, redirectPath) {
  const callbackUrl = new URL("/api/auth/callback/", getRequestOrigin(request));
  callbackUrl.searchParams.set("next", sanitizeRedirectPath(redirectPath));
  return callbackUrl.toString();
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const email = normalizeText(payload.email).toLowerCase();
  const password = normalizeText(payload.password);
  const displayName = normalizeText(payload.displayName);
  const organization = normalizeText(payload.organization);
  const emailRedirectTo = buildEmailRedirectTo(request, payload.redirectPath);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const session = await signUpWithPassword(email, password, {
      display_name: displayName || null,
      organization: organization || null
    }, emailRedirectTo);

    const user = session.user;
    let profile = null;
    if (user?.id) {
      profile = await ensureProfile(user, { displayName, organization });
      if (!isProfileActive(profile)) {
        return NextResponse.json({ errorCode: "account_inactive" }, { status: 403 });
      }
      await recordUserFootprint({
        userId: user.id,
        actorUserId: user.id,
        eventType: USER_FOOTPRINT_EVENTS.registered,
        summary: "User registered an Aifar account."
      });
    }

    const response = NextResponse.json({
      ok: true,
      user,
      profile,
      requiresConfirmation: !session.access_token
    });

    clearAuthCookies(response);
    setAuthCookies(response, session);
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json({ errorCode: "auth_service_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ errorCode: "auth_failed" }, { status: 400 });
  }
}
