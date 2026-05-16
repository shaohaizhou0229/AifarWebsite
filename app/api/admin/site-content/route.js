import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import {
  getAdminSitePageContent,
  sanitizeSiteLocale,
  sanitizeSitePageKey,
  saveSitePageDraft
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

async function getFallbackContent(pageKey, locale) {
  return getPageMessages(locale, pageKey);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pageKey = sanitizeSitePageKey(searchParams.get("page") || "home");
  const locale = sanitizeSiteLocale(searchParams.get("locale") || "en");

  if (!pageKey || !locale) {
    return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
  }

  try {
    await requireAdmin(getProfile);
    const fallback = await getFallbackContent(pageKey, locale);
    const result = await getAdminSitePageContent(pageKey, locale, fallback);
    return NextResponse.json(result);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not load site content." }, { status: 400 });
  }
}

export async function PATCH(request) {
  try {
    const { user } = await requireAdmin(getProfile);
    const body = await request.json();
    const pageKey = sanitizeSitePageKey(body.pageKey);
    const locale = sanitizeSiteLocale(body.locale);

    if (!pageKey || !locale) {
      return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
    }

    const entry = await saveSitePageDraft(pageKey, locale, user, body.content);
    const fallback = await getFallbackContent(pageKey, locale);
    const result = await getAdminSitePageContent(pageKey, locale, fallback);
    return NextResponse.json({ ...result, entry });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not save site content." }, { status: 400 });
  }
}
