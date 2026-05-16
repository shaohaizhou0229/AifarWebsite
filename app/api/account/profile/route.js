import { NextResponse } from "next/server";
import { AuthRequiredError, requireUser } from "@/lib/auth";
import { ensureProfile, updateProfile } from "@/lib/profiles";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
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
    return NextResponse.json({ profile });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUser();
    const payload = await request.json().catch(() => ({}));
    const profile = await updateProfile(user, {
      displayName: clean(payload.displayName),
      organization: clean(payload.organization),
      jobTitle: clean(payload.jobTitle),
      countryRegion: clean(payload.countryRegion),
      phone: clean(payload.phone)
    });
    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: USER_FOOTPRINT_EVENTS.profileUpdated,
      summary: "User updated their profile."
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
