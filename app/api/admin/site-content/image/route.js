import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, createUserSupabaseClient, getCurrentAccessToken, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
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
    const [, accessToken] = await Promise.all([requireAdminPermission(getProfile, ADMIN_PERMISSIONS.product), getCurrentAccessToken()]);
    const formData = await request.formData();
    const pageKey = sanitizeSitePageKey(String(formData.get("pageKey") || ""));
    const locale = sanitizeSiteLocale(String(formData.get("locale") || ""));
    const file = formData.get("file");

    if (!pageKey || !locale) {
      return NextResponse.json({ error: "Unknown page or locale." }, { status: 400 });
    }

    if (!isAllowedSiteImage(file)) {
      return NextResponse.json({ error: "Please upload a JPG, PNG, WEBP, or SVG image up to 5 MB." }, { status: 400 });
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
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not upload image." }, { status: 400 });
  }
}
