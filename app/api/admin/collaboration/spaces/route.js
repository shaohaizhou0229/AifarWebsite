import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createCollaborationSpace, listCollaborationSpaces, listMyCollaborationSubtasks } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const [spaces, subtasks] = await Promise.all([
      listCollaborationSpaces(user.id),
      listMyCollaborationSubtasks(user.id)
    ]);
    return NextResponse.json({ spaces, subtasks });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load collaboration spaces." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const context = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const payload = await request.json().catch(() => ({}));
    const space = await createCollaborationSpace({
      name: clean(payload.name),
      description: clean(payload.description)
    }, context);
    await recordUserFootprint({
      userId: context.user.id,
      actorUserId: context.user.id,
      eventType: "collaboration.space_created",
      summary: "Administrator created a collaboration space.",
      relatedType: "collaboration_space",
      relatedId: space.id
    });
    return NextResponse.json({ space }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to create collaboration space." }, { status: 500 });
  }
}
