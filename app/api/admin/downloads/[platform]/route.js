import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { sanitizePlatform, updateClientRelease } from "@/lib/downloads";

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
    const release = await updateClientRelease(platformKey, user, {
      version: normalizeText(body.version),
      buildNumber: normalizeText(body.buildNumber),
      releaseNotes: normalizeText(body.releaseNotes),
      externalUrl: normalizeUrl(body.externalUrl),
      isPublished: Boolean(body.isPublished)
    });

    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not update release." }, { status: 400 });
  }
}
