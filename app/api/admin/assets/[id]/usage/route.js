import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProjectAssetUsage } from "@/lib/project-assets";
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

export async function GET(_request, { params }) {
  const { id } = await params;

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.assets);
    const result = await getProjectAssetUsage(id);
    if (!result.asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }
    return NextResponse.json({ usage: result.usage });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not load asset usage." }, { status: 400 });
  }
}
