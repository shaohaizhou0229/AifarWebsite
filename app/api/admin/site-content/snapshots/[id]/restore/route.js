import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminSitePageContent, restoreSiteContentSnapshot } from "@/lib/site-content";
import { getPageMessages } from "@/i18n/messages";

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

export async function POST(_request, { params }) {
  const { id } = await params;

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const entry = await restoreSiteContentSnapshot(id, user);
    if (!entry) {
      return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
    }
    const fallback = await getPageMessages(entry.locale, entry.pageKey);
    const result = await getAdminSitePageContent(entry.pageKey, entry.locale, fallback);
    return NextResponse.json({ ...result, entry });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not restore snapshot." }, { status: 400 });
  }
}
