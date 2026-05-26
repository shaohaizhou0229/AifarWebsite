import { NextResponse } from "next/server";
import {
  AdminRequiredError,
  AuthRequiredError,
  createUserSupabaseClient,
  getCurrentAccessToken,
  requireAdmin
} from "@/lib/auth";
import {
  PROJECT_ASSET_BUCKET,
  buildProjectAssetUpload,
  createProjectAssetRecord
} from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";
import { recordUserFootprint } from "@/lib/user-footprints";

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

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file) => file instanceof File);
    const relativePaths = formData.getAll("relativePaths").map((value) => String(value || ""));
    const widths = formData.getAll("widths").map((value) => Number(value || 0));
    const heights = formData.getAll("heights").map((value) => Number(value || 0));

    if (!files.length) {
      return NextResponse.json({ error: "No image files were provided." }, { status: 400 });
    }

    const supabase = createUserSupabaseClient(accessToken);
    const results = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const upload = await buildProjectAssetUpload(file, {
          relativePath: relativePaths[index] || file.name,
          width: widths[index],
          height: heights[index]
        });
        const { error } = await supabase.storage
          .from(PROJECT_ASSET_BUCKET)
          .upload(upload.storagePath, upload.buffer, {
            contentType: upload.mimeType,
            upsert: false
          });

        if (error) {
          throw new Error(error.message);
        }

        const asset = await createProjectAssetRecord(user, upload);
        results.push({ ok: true, asset });
      } catch (error) {
        results.push({
          ok: false,
          filename: file.name,
          code: error.code || error.message || "uploadFailed",
          error: error.message || "Upload failed."
        });
      }
    }

    const uploaded = results.filter((result) => result.ok).length;
    if (uploaded) {
      await recordUserFootprint({
        userId: user.id,
        actorUserId: user.id,
        eventType: "asset.uploaded",
        summary: "Administrator uploaded project assets.",
        relatedType: "project_asset",
        metadata: { uploaded, failed: results.length - uploaded }
      });
    }

    return NextResponse.json({ results, uploaded, failed: results.length - uploaded });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: error.message || "Could not upload assets." }, { status: 400 });
  }
}
