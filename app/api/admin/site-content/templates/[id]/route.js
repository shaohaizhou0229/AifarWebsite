import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import {
  archiveSitePageTemplateRecord,
  updateSitePageTemplateRecord
} from "@/lib/site-content";

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
  if (String(id || "").startsWith("system-")) {
    return NextResponse.json({ error: "System templates cannot be edited." }, { status: 400 });
  }

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const body = await request.json().catch(() => ({}));
    const template = await updateSitePageTemplateRecord(id, user, body);
    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not update template." }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  if (String(id || "").startsWith("system-")) {
    return NextResponse.json({ error: "System templates cannot be archived." }, { status: 400 });
  }

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const template = await archiveSitePageTemplateRecord(id, user);
    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not archive template." }, { status: 400 });
  }
}
