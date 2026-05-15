import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { clientReleaseFileExists, getAdminDownloadPlatform, sanitizePlatform, updateClientRelease } from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value) {
  const text = normalizeText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function PATCH(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const { user } = await requireAdmin(getProfile);
    const body = await request.json();
    const externalUrl = normalizeUrl(body.externalUrl);
    const isPublished = Boolean(body.isPublished);

    if (isPublished && !externalUrl) {
      const current = await getAdminDownloadPlatform(platformKey);
      const release = current?.release;

      if (!release?.storagePath || release.uploadStatus !== "uploaded" || !release.checksumSha256) {
        return NextResponse.json({ error: "A completed release file is required before publishing." }, { status: 400 });
      }

      const fileExists = await clientReleaseFileExists(release.storagePath);
      if (!fileExists) {
        return NextResponse.json({ error: "The release file is missing from storage. Delete it and upload again." }, { status: 400 });
      }
    }

    const release = await updateClientRelease(platformKey, user, {
      version: normalizeText(body.version),
      buildNumber: normalizeText(body.buildNumber),
      releaseNotes: normalizeText(body.releaseNotes),
      externalUrl,
      isPublished
    });

    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not update release." }, { status: 400 });
  }
}
