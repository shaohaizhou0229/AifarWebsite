import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { completeProjectAssetUpload } from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

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

    const asset = await completeProjectAssetUpload(sessionId, user, input);
    if (!asset) {
      return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
    }

    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: "asset.uploaded",
      summary: "Administrator uploaded a project asset.",
      relatedType: "project_asset",
      relatedId: asset.id,
      metadata: { storagePath: asset.storagePath, directoryPath: asset.directoryPath }
    });

    return NextResponse.json({ asset });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not complete upload." }, { status: 400 });
  }
}
