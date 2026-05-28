import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getProfile } from "@/lib/profiles";
import {
  createSiteSectionTemplateRecord,
  listSiteSectionTemplates,
  sanitizeSectionTemplateLocale,
  sanitizeSectionTemplatePageKey
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locale = sanitizeSectionTemplateLocale(searchParams.get("locale") || "en");
  const pageKey = searchParams.get("page")
    ? sanitizeSectionTemplatePageKey(searchParams.get("page"))
    : "";

  if (!locale || (searchParams.get("page") && !pageKey)) {
    return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
  }

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const templates = await listSiteSectionTemplates({
      locale,
      pageKey,
      source: searchParams.get("source") || "",
      industry: searchParams.get("industry") || "",
      includeArchived: searchParams.get("includeArchived") === "true"
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not list section templates." }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const body = await request.json().catch(() => ({}));
    const template = await createSiteSectionTemplateRecord(user, body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not create section template.", code: error.code || "" }, { status: 400 });
  }
}
