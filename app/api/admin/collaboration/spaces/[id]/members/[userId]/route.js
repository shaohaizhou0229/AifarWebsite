import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { removeCollaborationMember } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";

function permissionError(error) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AdminRequiredError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

export async function DELETE(_request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id, userId } = await params;
    const removed = await removeCollaborationMember(id, userId, user.id);
    return NextResponse.json({ removed });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to remove collaboration member." }, { status: 500 });
  }
}
