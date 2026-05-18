import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { sanitizePlatform, updateClientReleaseUploadStatus } from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set(["idle", "failed"]);

export async function POST(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
    const body = await request.json().catch(() => ({}));
    const uploadStatus = String(body.uploadStatus || "");

    if (!ALLOWED_STATUS.has(uploadStatus)) {
      return NextResponse.json({ error: "Unsupported upload status." }, { status: 400 });
    }

    const release = await updateClientReleaseUploadStatus(platformKey, user, uploadStatus);
    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not update upload status." }, { status: 400 });
  }
}
