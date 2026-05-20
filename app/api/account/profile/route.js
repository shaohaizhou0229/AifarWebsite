import { NextResponse } from "next/server";
import { AuthRequiredError, clearAuthCookies, requireUser } from "@/lib/auth";
import coreRules from "@/lib/core-rules.cjs";
import { ensureProfile, isProfileActive, selfDeleteProfile, updateProfile } from "@/lib/profiles";
import { updateNotificationPreferences } from "@/lib/notifications";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function clean(value) {
  return coreRules.clean(value);
}

function authError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return null;
}

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await ensureProfile(user);
    if (!isProfileActive(profile)) {
      return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUser();
    const current = await ensureProfile(user);
    if (!isProfileActive(current)) {
      return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    }
    const payload = await request.json().catch(() => ({}));
    const profile = await updateProfile(user, coreRules.normalizeProfileInput(payload));
    const notificationPreferences = await updateNotificationPreferences(user.id, payload.notificationPreferences || {});
    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: USER_FOOTPRINT_EVENTS.profileUpdated,
      summary: "User updated their profile."
    });

    return NextResponse.json({ profile: { ...profile, notificationPreferences } });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await requireUser();
    const payload = await request.json().catch(() => ({}));
    const profile = await selfDeleteProfile(user, clean(payload.reason) || "Self-service account deletion.");
    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: USER_FOOTPRINT_EVENTS.accountDeleted,
      summary: "User deleted their own account.",
      relatedType: "profile",
      relatedId: user.id
    });

    const response = NextResponse.json({ ok: true, profile });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return authError(error) || NextResponse.json({ error: error.message || "Unable to delete account." }, { status: 500 });
  }
}
