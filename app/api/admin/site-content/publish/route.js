import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { getAdminSitePageContent, publishSitePageDraft, sanitizeSiteLocale, sanitizeSitePageKey } from "@/lib/site-content";
import { getPageMessages } from "@/i18n/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { user } = await requireAdmin(getProfile);
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
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not publish site content." }, { status: 400 });
  }
}
