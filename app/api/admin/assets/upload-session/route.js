import { NextResponse } from "next/server";
import {
  AdminRequiredError,
  AuthRequiredError,
  getCurrentAccessToken,
  getSupabaseAnonKey,
  getSupabaseStorageUrl,
  requireAdmin
} from "@/lib/auth";
import {
  PROJECT_ASSET_BUCKET,
  PROJECT_ASSET_UPLOAD_CHUNK_SIZE,
  createProjectAssetUploadSession
} from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";

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
    const [{ user }, accessToken] = await Promise.all([requireAdmin(getProfile), getCurrentAccessToken()]);
    if (!accessToken) {
      return NextResponse.json({ error: "A valid admin session is required." }, { status: 401 });
    }

    const session = await createProjectAssetUploadSession(user, await request.json().catch(() => ({})));

    return NextResponse.json({
      session,
      bucket: PROJECT_ASSET_BUCKET,
      storagePath: session.storagePath,
      endpoint: `${getSupabaseStorageUrl()}/storage/v1/upload/resumable`,
      headers: {
        apikey: getSupabaseAnonKey(),
        authorization: `Bearer ${accessToken}`
      },
      chunkSize: PROJECT_ASSET_UPLOAD_CHUNK_SIZE
    });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not create upload session.", code: error.code || "uploadSessionFailed" }, { status: 400 });
  }
}
