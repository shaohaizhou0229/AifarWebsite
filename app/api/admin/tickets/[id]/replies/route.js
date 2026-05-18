import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { addAdminReply, normalizeText } from "@/lib/tickets";

export const runtime = "nodejs";

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
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.support);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const message = normalizeText(payload.message);

    if (!message) {
      return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
    }

    await addAdminReply(id, user, message);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to add reply." }, { status: 500 });
  }
}
