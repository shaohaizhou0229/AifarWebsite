import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { updateCollaborationTask } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";

function permissionError(error) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AdminRequiredError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

export async function PATCH(request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const task = await updateCollaborationTask(id, payload, user.id);
    return NextResponse.json({ task });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to update collaboration task." }, { status: 500 });
  }
}
