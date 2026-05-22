import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { archiveSiteContentSnapshot, listSiteContentSnapshots } from "@/lib/site-content";

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

export async function DELETE(_request, { params }) {
  const { id } = await params;

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const snapshot = await archiveSiteContentSnapshot(id, user);
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }
    const snapshots = await listSiteContentSnapshots(snapshot.pageKey, snapshot.locale);
    return NextResponse.json({ snapshot, snapshots });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not delete snapshot." }, { status: 400 });
  }
}
