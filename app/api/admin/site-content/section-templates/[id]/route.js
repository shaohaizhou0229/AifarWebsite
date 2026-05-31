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

const DATABASE_TEMPLATE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function permissionError(error) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AdminRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

function validateEditableTemplateId(id) {
  const value = String(id || "").trim();
  if (value.startsWith("system-")) {
    return NextResponse.json({ error: "System section templates cannot be edited or archived.", code: "systemTemplateReadonly" }, { status: 400 });
  }
  if (!DATABASE_TEMPLATE_ID_PATTERN.test(value)) {
    return NextResponse.json({ error: "Only saved section templates can be edited or archived.", code: "unsavedSectionTemplate" }, { status: 400 });
  }
  return null;
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const invalidIdResponse = validateEditableTemplateId(id);
  if (invalidIdResponse) return invalidIdResponse;

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
  const invalidIdResponse = validateEditableTemplateId(id);
  if (invalidIdResponse) return invalidIdResponse;

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
