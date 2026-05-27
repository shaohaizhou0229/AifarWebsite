import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { bulkUpdateProjectAssets } from "@/lib/project-assets";
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

export async function PATCH(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.assets);
    const result = await bulkUpdateProjectAssets(user, await request.json().catch(() => ({})));

    await recordUserFootprint({
      userId: user.id,
      actorUserId: user.id,
      eventType: "asset.bulk_updated",
      summary: "Administrator updated project assets in bulk.",
      relatedType: "project_asset",
      metadata: { action: result.action, updated: result.updated }
    });

    return NextResponse.json(result);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not update assets." }, { status: 400 });
  }
}
