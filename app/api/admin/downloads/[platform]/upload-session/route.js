import { NextResponse } from "next/server";
import {
  AdminRequiredError,
  createUserSupabaseClient,
  getCurrentAccessToken,
  getSupabaseUrl,
  requireAdmin
} from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import {
  DOWNLOAD_BUCKET,
  MAX_RELEASE_FILE_SIZE,
  RELEASE_UPLOAD_CHUNK_SIZE,
  createStoragePath,
  isAllowedReleaseFilename,
  markClientReleaseUploading,
  sanitizePlatform
} from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSignedUploadToken(data) {
  if (data?.token) return data.token;

  if (data?.signedUrl) {
    try {
      const url = new URL(data.signedUrl);
      return url.searchParams.get("token") || url.searchParams.get("signature") || "";
    } catch {
      return "";
    }
  }

  return "";
}

export async function POST(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const [{ user }, accessToken] = await Promise.all([requireAdmin(getProfile), getCurrentAccessToken()]);
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
    const supabase = createUserSupabaseClient(accessToken);
    const { data, error } = await supabase.storage.from(DOWNLOAD_BUCKET).createSignedUploadUrl(storagePath);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const token = getSignedUploadToken(data);
    if (!token) {
      return NextResponse.json({ error: "Supabase did not return an upload signature." }, { status: 400 });
    }

    const release = await markClientReleaseUploading(platformKey, user, {
      storagePath,
      fileSize,
      originalFilename: filename,
      contentType
    });

    return NextResponse.json({
      bucket: DOWNLOAD_BUCKET,
      storagePath,
      endpoint: `${getSupabaseUrl()}/storage/v1/upload/resumable`,
      headers: {
        "x-signature": token
      },
      chunkSize: RELEASE_UPLOAD_CHUNK_SIZE,
      release
    });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not create upload session." }, { status: 400 });
  }
}
