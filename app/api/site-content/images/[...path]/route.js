import { NextResponse } from "next/server";
import {
  createPublicSupabaseClient,
  createUserSupabaseClient,
  getCurrentAccessToken,
  requireAdmin
} from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import {
  PROJECT_ASSET_BUCKET,
  isPublicProjectAssetImage,
  normalizePublicAssetPath
} from "@/lib/project-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { path = [] } = await params;
  const storagePath = normalizePublicAssetPath(path);

  if (!storagePath) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  let supabase = null;
  const cacheControl = "private, no-store, max-age=0";
  if (await isPublicProjectAssetImage(storagePath)) {
    supabase = createPublicSupabaseClient();
  } else {
    try {
      await requireAdmin(getProfile);
      supabase = createUserSupabaseClient(await getCurrentAccessToken());
    } catch {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
  }

  const { data, error } = await supabase.storage.from(PROJECT_ASSET_BUCKET).download(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Image not found." }, { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": cacheControl
    }
  });
}
