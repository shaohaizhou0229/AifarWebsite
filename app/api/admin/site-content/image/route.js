import { NextResponse } from "next/server";
import { AdminRequiredError, createUserSupabaseClient, getCurrentAccessToken, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import {
  SITE_CONTENT_BUCKET,
  buildSiteImageUpload,
  getSiteImageUrl,
  isAllowedSiteImage,
  sanitizeSiteLocale,
  sanitizeSitePageKey
} from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const [, accessToken] = await Promise.all([requireAdmin(getProfile), getCurrentAccessToken()]);
    const formData = await request.formData();
    const pageKey = sanitizeSitePageKey(String(formData.get("pageKey") || ""));
    const locale = sanitizeSiteLocale(String(formData.get("locale") || ""));
    const file = formData.get("file");

    if (!pageKey || !locale) {
      return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
    }

    if (!isAllowedSiteImage(file)) {
      return NextResponse.json({ error: "Please upload a jpg, png, or webp image up to 10 MB." }, { status: 400 });
    }

    const upload = await buildSiteImageUpload(file, pageKey, locale);
    const supabase = createUserSupabaseClient(accessToken);
    const { error } = await supabase.storage
      .from(SITE_CONTENT_BUCKET)
      .upload(upload.storagePath, upload.buffer, {
        contentType: upload.contentType,
        upsert: false
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      storagePath: upload.storagePath,
      url: getSiteImageUrl(upload.storagePath),
      originalFilename: upload.originalFilename,
      fileSize: upload.fileSize
    });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not upload image." }, { status: 400 });
  }
}
