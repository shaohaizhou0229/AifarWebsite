import { NextResponse } from "next/server";
import {
  AdminRequiredError,
  getCurrentAccessToken,
  getSupabaseAnonKey,
  getSupabaseStorageUrl,
  requireAdmin
} from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import {
  DOWNLOAD_BUCKET,
  MAX_RELEASE_FILE_SIZE,
  RELEASE_UPLOAD_CHUNK_SIZE,
  createStoragePath,
  isAllowedReleaseFilename,
  sanitizePlatform
} from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const [, accessToken] = await Promise.all([requireAdmin(getProfile), getCurrentAccessToken()]);
    const input = await request.json().catch(() => ({}));
    const filename = String(input.filename || "");
    const fileSize = Number(input.fileSize || 0);
    const contentType = String(input.contentType || "application/octet-stream");

    if (!filename || !fileSize) {
      return NextResponse.json({ error: "Filename and file size are required." }, { status: 400 });
    }

    if (fileSize > MAX_RELEASE_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 300 MB or less." }, { status: 400 });
    }

    if (!isAllowedReleaseFilename(filename)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const storagePath = createStoragePath(platformKey, filename);

    if (!accessToken) {
      return NextResponse.json({ error: "A valid admin session is required." }, { status: 401 });
    }

    return NextResponse.json({
      bucket: DOWNLOAD_BUCKET,
      storagePath,
      endpoint: `${getSupabaseStorageUrl()}/storage/v1/upload/resumable`,
      headers: {
        apikey: getSupabaseAnonKey(),
        authorization: `Bearer ${accessToken}`
      },
      chunkSize: RELEASE_UPLOAD_CHUNK_SIZE
    });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not create upload session." }, { status: 400 });
  }
}
