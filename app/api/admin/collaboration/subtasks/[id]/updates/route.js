import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createCollaborationSubtaskUpdate } from "@/lib/collaboration";
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

export async function POST(request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const result = await createCollaborationSubtaskUpdate(id, payload, user.id, String(payload.locale || "zh-CN"));
    await recordUserFootprint({
      userId: result.subtask.assigneeUserId || user.id,
      actorUserId: user.id,
      eventType: "collaboration.subtask_feedback_created",
      summary: "Administrator added a collaboration subtask update.",
      relatedType: "collaboration_subtask",
      relatedId: result.subtask.id,
      metadata: { status: result.subtask.status }
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to create collaboration subtask update." }, { status: 500 });
  }
}
