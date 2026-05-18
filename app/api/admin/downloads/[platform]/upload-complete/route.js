import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import {
  MAX_RELEASE_FILE_SIZE,
  isAllowedReleaseFilename,
  sanitizePlatform,
  updateClientReleaseFile
} from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSha256(value = "") {
  return /^[a-f0-9]{64}$/i.test(value);
}

export async function POST(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads);
    const input = await request.json().catch(() => ({}));
    const storagePath = String(input.storagePath || "");
    const fileSize = Number(input.fileSize || 0);
    const checksumSha256 = String(input.checksumSha256 || "").toLowerCase();
    const originalFilename = String(input.originalFilename || "");
    const contentType = String(input.contentType || "application/octet-stream");

    if (!storagePath.startsWith(`${platformKey}/`)) {
      return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    }

    if (!fileSize || fileSize > MAX_RELEASE_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 300 MB or less." }, { status: 400 });
    }

    if (!isAllowedReleaseFilename(originalFilename || storagePath)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    if (!isSha256(checksumSha256)) {
      return NextResponse.json({ error: "A valid SHA-256 checksum is required." }, { status: 400 });
    }

    const release = await updateClientReleaseFile(platformKey, user, {
      storagePath,
      fileSize,
      checksumSha256,
      originalFilename,
      contentType
    });

    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not complete upload." }, { status: 400 });
  }
}
