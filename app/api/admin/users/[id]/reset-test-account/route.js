import { NextResponse } from "next/server";
import { AdminRequiredError, AuthConfigurationError, AuthRequiredError, deleteAuthUser, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { assertCanResetTestAccount, getAdminUser, getProfile, resetTestAccount } from "@/lib/profiles";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

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

export async function POST(request, { params }) {
  try {
    const { user: adminUser } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const confirmEmail = clean(payload.confirmEmail).toLowerCase();
    const reason = clean(payload.reason) || "UAT test account reset";
    const target = await getAdminUser(id);

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (confirmEmail !== String(target.email || "").toLowerCase()) {
      return NextResponse.json({ error: "Email confirmation does not match the target account." }, { status: 400 });
    }

    await assertCanResetTestAccount(id, adminUser.id);
    const authResult = await deleteAuthUser(id);
    const resetResult = await resetTestAccount(id, adminUser.id, reason);

    await recordUserFootprint({
      userId: id,
      actorUserId: adminUser.id,
      eventType: USER_FOOTPRINT_EVENTS.adminTestAccountReset,
      summary: "Administrator reset a UAT test account.",
      relatedType: "profile",
      relatedId: id,
      metadata: {
        originalEmail: resetResult.originalEmail,
        archivedEmail: resetResult.archivedEmail,
        authDeleted: authResult.deleted,
        authMissing: authResult.missing,
        canceledInvitationCount: resetResult.canceledInvitationCount,
        reason
      }
    });

    return NextResponse.json({
      user: resetResult.user,
      originalEmail: resetResult.originalEmail,
      archivedEmail: resetResult.archivedEmail,
      authDeleted: authResult.deleted,
      authMissing: authResult.missing,
      canceledInvitationCount: resetResult.canceledInvitationCount
    });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to reset test account." }, { status: 500 });
  }
}
