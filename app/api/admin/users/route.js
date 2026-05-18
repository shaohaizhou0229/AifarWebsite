import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createUserInvitation, getProfile, listAdminUsers } from "@/lib/profiles";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const runtime = "nodejs";

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function GET(request) {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const url = new URL(request.url);
    const users = await listAdminUsers(url.searchParams.get("q") || "", url.searchParams.get("status") || "all");
    return NextResponse.json({ users });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  try {
    const { user: adminUser } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const payload = await request.json().catch(() => ({}));
    const invitation = await createUserInvitation({
      email: clean(payload.email),
      displayName: clean(payload.displayName),
      organization: clean(payload.organization),
      jobTitle: clean(payload.jobTitle),
      countryRegion: clean(payload.countryRegion),
      phone: clean(payload.phone),
      role: clean(payload.role),
      adminPermissions: Array.isArray(payload.adminPermissions) ? payload.adminPermissions : []
    }, adminUser.id);

    await recordUserFootprint({
      userId: adminUser.id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminUserInvited,
      summary: "Administrator created a user invitation.",
      relatedType: "profile",
      metadata: { email: invitation.email, role: invitation.role }
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to invite user." }, { status: 500 });
  }
}
