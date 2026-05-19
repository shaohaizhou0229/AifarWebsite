import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getCollaborationSubtask, updateCollaborationSubtask } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

export const runtime = "nodejs";

function permissionError(error) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AdminRequiredError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (String(error.message || "").toLowerCase().includes("not found")) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return null;
}

export async function GET(_request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const subtask = await getCollaborationSubtask(id, user.id);
    return NextResponse.json(subtask);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to load collaboration subtask." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const subtask = await updateCollaborationSubtask(id, payload, user.id, String(payload.locale || "zh-CN"));
    await recordUserFootprint({
      userId: subtask.assigneeUserId || user.id,
      actorUserId: user.id,
      eventType: "collaboration.subtask_updated",
      summary: "Administrator updated a collaboration subtask.",
      relatedType: "collaboration_subtask",
      relatedId: subtask.id,
      metadata: { status: subtask.status }
    });
    return NextResponse.json({ subtask });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to update collaboration subtask." }, { status: 500 });
  }
}
