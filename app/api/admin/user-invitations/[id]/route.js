import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { cancelUserInvitation, getProfile, getUserInvitation } from "@/lib/profiles";
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

export async function GET(_request, { params }) {
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const { id } = await params;
    const invitation = await getUserInvitation(id);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load invitation." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { user: adminUser } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const { id } = await params;
    const invitation = await cancelUserInvitation(id, adminUser.id);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    await recordUserFootprint({
      userId: adminUser.id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminInvitationCanceled,
      summary: "Administrator canceled a user invitation.",
      metadata: { email: invitation.email }
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to cancel invitation." }, { status: 500 });
  }
}
