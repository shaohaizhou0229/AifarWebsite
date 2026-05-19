import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createCollaborationTask } from "@/lib/collaboration";
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
    const task = await createCollaborationTask(id, payload, user.id);
    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: "collaboration.task_created",
      summary: "Administrator created a collaboration task.",
      relatedType: "collaboration_task",
      relatedId: task.id
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to create collaboration task." }, { status: 500 });
  }
}
