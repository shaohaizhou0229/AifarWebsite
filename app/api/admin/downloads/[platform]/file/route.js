import { NextResponse } from "next/server";
import { AdminRequiredError, createUserSupabaseClient, getCurrentAccessToken, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import {
  DOWNLOAD_BUCKET,
  buildFileUpload,
  sanitizePlatform,
  updateClientReleaseFile
} from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 300 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["exe", "msi", "dmg", "pkg", "apk", "zip"]);

function getExtension(filename = "") {
  return filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
}

export async function POST(request, { params }) {
  const { platform } = await params;
  const platformKey = sanitizePlatform(platform);

  if (!platformKey) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 404 });
  }

  try {
    const [{ user }, accessToken] = await Promise.all([requireAdmin(getProfile), getCurrentAccessToken()]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A release file is required." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 300 MB or less." }, { status: 400 });
    }

    const extension = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const upload = await buildFileUpload(file, platformKey);
    const supabase = createUserSupabaseClient(accessToken);
    const { error } = await supabase.storage
      .from(DOWNLOAD_BUCKET)
      .upload(upload.storagePath, upload.buffer, {
        contentType: upload.contentType,
        upsert: false
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const release = await updateClientReleaseFile(platformKey, user, upload);
    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Could not upload release file." }, { status: 400 });
  }
}
