import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { addCollaborationMember } from "@/lib/collaboration";
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
    const memberUserId = String(payload.userId || "").trim();
    if (!memberUserId) return NextResponse.json({ error: "Member is required." }, { status: 400 });
    await addCollaborationMember(id, memberUserId, user.id, String(payload.locale || "zh-CN"));
    await recordUserFootprint({
      userId: memberUserId,
      actorUserId: user.id,
      eventType: "collaboration.member_added",
      summary: "Administrator added a collaboration space member.",
      relatedType: "collaboration_space",
      relatedId: id
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Unable to add collaboration member." }, { status: 500 });
  }
}
