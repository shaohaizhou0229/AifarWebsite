import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createCollaborationSubtask } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

export const runtime = "nodejs";

function permissionError(error) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AdminRequiredError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

export async function POST(request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const subtask = await createCollaborationSubtask(id, payload, user.id, String(payload.locale || "zh-CN"));
    await recordUserFootprint({
      userId: subtask.assigneeUserId || user.id,
      actorUserId: user.id,
      eventType: "collaboration.subtask_created",
      summary: "Administrator created a collaboration subtask.",
      relatedType: "collaboration_subtask",
      relatedId: subtask.id
    });
    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to create collaboration subtask." }, { status: 500 });
  }
}
