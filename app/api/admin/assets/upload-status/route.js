import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { updateProjectAssetUploadStatus } from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export async function POST(request) {
  try {
    const { user } = await requireAdmin(getProfile);
    const input = await request.json().catch(() => ({}));
    const sessionId = String(input.sessionId || "");
    if (!sessionId) {
      return NextResponse.json({ error: "Upload session is required." }, { status: 400 });
    }

    const session = await updateProjectAssetUploadStatus(sessionId, user, input);
    if (!session) {
      return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not update upload status." }, { status: 400 });
  }
}
