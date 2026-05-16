import { NextResponse } from "next/server";
import { createPublicSupabaseClient, getCurrentUser } from "@/lib/auth";
import { DOWNLOAD_BUCKET, clientReleaseFileExists, getPublishedRelease, sanitizePlatform } from "@/lib/downloads";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

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
    const user = await getCurrentUser();
    await recordUserFootprint({
      userId: user?.id,
      actorUserId: user?.id,
      eventType: USER_FOOTPRINT_EVENTS.downloadStarted,
      summary: `User started a ${platformKey} client download.`,
      relatedType: "client_release",
      metadata: { platform: platformKey, version: result.release.version }
    });
    return NextResponse.redirect(result.release.externalUrl);
  }

  if (!result.release.storagePath) {
    return NextResponse.json({ error: "No download file is available." }, { status: 404 });
  }

  const fileExists = await clientReleaseFileExists(result.release.storagePath);
  if (!fileExists) {
    return NextResponse.json({ error: "The published download file is missing. Please contact support." }, { status: 404 });
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.storage
    .from(DOWNLOAD_BUCKET)
    .createSignedUrl(result.release.storagePath, 60 * 10, {
      download: result.release.originalFilename || true
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not create download link." }, { status: 500 });
  }

  const user = await getCurrentUser();
  await recordUserFootprint({
    userId: user?.id,
    actorUserId: user?.id,
    eventType: USER_FOOTPRINT_EVENTS.downloadStarted,
    summary: `User started a ${platformKey} client download.`,
    relatedType: "client_release",
    metadata: { platform: platformKey, version: result.release.version }
  });

  return NextResponse.redirect(data.signedUrl);
}
