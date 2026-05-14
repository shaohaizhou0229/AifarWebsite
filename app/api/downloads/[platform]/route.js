import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/auth";
import { DOWNLOAD_BUCKET, getPublishedRelease, sanitizePlatform } from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  const result = await getPublishedRelease(platformKey);

  if (!result?.release?.isPublished) {
    return NextResponse.json({ error: "This download is not published." }, { status: 404 });
  }

  if (result.release.externalUrl) {
    return NextResponse.redirect(result.release.externalUrl);
  }

  if (!result.release.storagePath) {
    return NextResponse.json({ error: "No download file is available." }, { status: 404 });
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.storage
    .from(DOWNLOAD_BUCKET)
    .createSignedUrl(result.release.storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not create download link." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
