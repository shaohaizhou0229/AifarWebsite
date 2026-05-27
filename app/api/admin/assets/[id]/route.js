import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProjectAsset, updateProjectAsset } from "@/lib/project-assets";
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

export async function PATCH(request, { params }) {
  const { id } = await params;

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.assets);
    const asset = await updateProjectAsset(id, user, await request.json().catch(() => ({})));
    if (!asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: "asset.updated",
      summary: "Administrator updated a project asset.",
      relatedType: "project_asset",
      relatedId: asset.id,
      metadata: { displayName: asset.displayName, directoryPath: asset.directoryPath }
    });

    return NextResponse.json({ asset });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not update asset." }, { status: 400 });
  }
}

export async function GET(_request, { params }) {
  const { id } = await params;

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.assets);
    const asset = await getProjectAsset(id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }
    return NextResponse.json({ asset });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not load asset." }, { status: 400 });
  }
}
