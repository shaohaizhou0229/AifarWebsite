import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminSitePageContent, publishSitePageDraft, sanitizeSiteLocale, sanitizeSitePageKey } from "@/lib/site-content";
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

export async function POST(request) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product);
    const body = await request.json();
    const pageKey = sanitizeSitePageKey(body.pageKey);
    const locale = sanitizeSiteLocale(body.locale);

    if (!pageKey || !locale) {
      return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
    }

    const entry = await publishSitePageDraft(pageKey, locale, user);
    const fallback = await getPageMessages(locale, pageKey);
    const result = await getAdminSitePageContent(pageKey, locale, fallback);
    return NextResponse.json({ ...result, entry });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not publish site content." }, { status: 400 });
  }
}
