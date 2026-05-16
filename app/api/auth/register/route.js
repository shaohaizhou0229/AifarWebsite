import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/profiles";
import { setAuthCookies, signUpWithPassword } from "@/lib/auth";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const email = normalizeText(payload.email).toLowerCase();
  const password = normalizeText(payload.password);
  const displayName = normalizeText(payload.displayName);
  const organization = normalizeText(payload.organization);

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
    });

    const user = session.user;
    let profile = null;
    if (user?.id) {
      profile = await ensureProfile(user, { displayName, organization });
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

    setAuthCookies(response, session);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Registration failed." }, { status: 400 });
  }
}
