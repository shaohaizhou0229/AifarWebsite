import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getAdminUser, getProfile, updateAdminUserProfile } from "@/lib/profiles";
import { listAdminTicketsForUser } from "@/lib/tickets";
import { listUserFootprints, recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function GET(_request, { params }) {
  try {
    await requireAdmin(getProfile);
    const { id } = await params;
    const user = await getAdminUser(id);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const [tickets, footprints] = await Promise.all([
      listAdminTicketsForUser(user),
      listUserFootprints(user.id)
    ]);

    return NextResponse.json({ user, tickets, footprints });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load user." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user: adminUser } = await requireAdmin(getProfile);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const user = await updateAdminUserProfile(id, {
      displayName: clean(payload.displayName),
      organization: clean(payload.organization),
      jobTitle: clean(payload.jobTitle),
      countryRegion: clean(payload.countryRegion),
      phone: clean(payload.phone),
      role: clean(payload.role)
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await recordUserFootprint({
      userId: id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminUserUpdated,
      summary: "Administrator updated user profile or role.",
      relatedType: "profile",
      relatedId: id,
      metadata: { role: user.role }
    });

    return NextResponse.json({ user });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to update user." }, { status: 500 });
  }
}
