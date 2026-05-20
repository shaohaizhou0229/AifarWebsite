import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import {
  applySitePageTemplateToDraft,
  getAdminSitePageContent,
  listSiteContentSnapshots,
  listSitePageTemplates,
  sanitizeSiteLocale,
  sanitizeSitePageKey
} from "@/lib/site-content";
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

export async function POST(request, { params }) {
  const { id } = await params;

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const body = await request.json().catch(() => ({}));
    const pageKey = sanitizeSitePageKey(body.pageKey);
    const locale = sanitizeSiteLocale(body.locale);

    if (!pageKey || !locale) {
      return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
    }

    const fallback = await getPageMessages(locale, pageKey);
    const entry = await applySitePageTemplateToDraft(id, pageKey, locale, user, fallback);
    if (!entry) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    const [result, snapshots, templates] = await Promise.all([
      getAdminSitePageContent(pageKey, locale, fallback),
      listSiteContentSnapshots(pageKey, locale),
      listSitePageTemplates(pageKey, locale)
    ]);
    return NextResponse.json({ ...result, entry, snapshots, templates });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not apply template." }, { status: 400 });
  }
}
