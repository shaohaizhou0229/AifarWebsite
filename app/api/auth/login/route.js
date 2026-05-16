import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profiles";
import { AuthConfigurationError, setAuthCookies, signInWithPassword } from "@/lib/auth";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const email = normalizeText(payload.email).toLowerCase();
  const password = normalizeText(payload.password);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const session = await signInWithPassword(email, password);
    const profile = await ensureProfile(session.user);
    await recordUserFootprint({
      userId: session.user.id,
      actorUserId: session.user.id,
      eventType: USER_FOOTPRINT_EVENTS.loggedIn,
      summary: "User signed in with email and password."
    });
    const response = NextResponse.json({ ok: true, user: session.user, profile });
    setAuthCookies(response, session);
    return response;
  } catch (error) {
    console.error("Sign in failed", error);
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json({ errorCode: "auth_service_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ errorCode: "auth_failed" }, { status: 401 });
  }
}
