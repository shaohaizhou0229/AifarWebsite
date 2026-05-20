import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { listClientReleaseVersions, sanitizePlatform } from "@/lib/downloads";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
    const { searchParams } = new URL(request.url);
    const versions = await listClientReleaseVersions(platformKey, searchParams.get("limit") || 20);
    return NextResponse.json({ versions });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Could not load release versions." }, { status: 400 });
  }
}
