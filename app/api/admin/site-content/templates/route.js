import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import {
  createSitePageTemplateRecord,
  listSitePageTemplates,
  sanitizeSiteLocale,
  sanitizeSitePageKey
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pageKey = sanitizeSitePageKey(searchParams.get("page") || "home");
  const locale = sanitizeSiteLocale(searchParams.get("locale") || "en");

  if (!pageKey || !locale) {
    return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
  }

  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const templates = await listSitePageTemplates(pageKey, locale);
    return NextResponse.json({ templates });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not list templates." }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const body = await request.json().catch(() => ({}));
    const pageKey = sanitizeSitePageKey(body.pageKey);
    const locale = sanitizeSiteLocale(body.locale);

    if (!pageKey || !locale) {
      return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
    }

    const template = await createSitePageTemplateRecord(pageKey, locale, user, body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not create template." }, { status: 400 });
  }
}
