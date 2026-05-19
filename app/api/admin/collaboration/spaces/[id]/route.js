import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getCollaborationSpace, updateCollaborationSpace } from "@/lib/collaboration";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function permissionError(error) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AdminRequiredError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

export async function GET(_request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const space = await getCollaborationSpace(id, user.id);
    if (!space) return NextResponse.json({ error: "Collaboration space not found." }, { status: 404 });
    return NextResponse.json({ space });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to load collaboration space." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.collaboration);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const space = await updateCollaborationSpace(id, {
      name: clean(payload.name),
      description: clean(payload.description),
      status: clean(payload.status)
    }, user.id);
    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: "collaboration.space_updated",
      summary: "Administrator updated a collaboration space.",
      relatedType: "collaboration_space",
      relatedId: id
    });
    return NextResponse.json({ space });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to update collaboration space." }, { status: 500 });
  }
}
