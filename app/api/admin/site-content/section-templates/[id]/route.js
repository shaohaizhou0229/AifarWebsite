import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import {
  archiveSiteSectionTemplateRecord,
  updateSiteSectionTemplateRecord
} from "@/lib/site-section-templates";

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
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const body = await request.json().catch(() => ({}));
    const template = await updateSiteSectionTemplateRecord(id, user, body);
    if (!template) {
      return NextResponse.json({ error: "Section template not found." }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not update section template.", code: error.code || "" }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const template = await archiveSiteSectionTemplateRecord(id, user);
    if (!template) {
      return NextResponse.json({ error: "Section template not found." }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not archive section template.", code: error.code || "" }, { status: 400 });
  }
}
