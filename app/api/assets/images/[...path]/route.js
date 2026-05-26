import { NextResponse } from "next/server";
import {
  createPublicSupabaseClient,
  createUserSupabaseClient,
  getCurrentAccessToken,
  requireAdmin
} from "@/lib/auth";
import {
  PROJECT_ASSET_BUCKET,
  isPublicProjectAssetImage,
  normalizePublicAssetPath
} from "@/lib/project-assets";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createReadableStorageClient(storagePath) {
  if (await isPublicProjectAssetImage(storagePath)) {
    return {
      supabase: createPublicSupabaseClient(),
      cacheControl: "public, max-age=300, stale-while-revalidate=3600"
    };
  }

  try {
    await requireAdmin(getProfile);
    const accessToken = await getCurrentAccessToken();
    return {
      supabase: createUserSupabaseClient(accessToken),
      cacheControl: "private, max-age=60"
    };
  } catch {
    return null;
  }
}

export async function GET(_request, { params }) {
  const { path = [] } = await params;
  const storagePath = normalizePublicAssetPath(path);

  if (!storagePath) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const readable = await createReadableStorageClient(storagePath);
  if (!readable) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const { data, error } = await readable.supabase.storage.from(PROJECT_ASSET_BUCKET).download(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Image not found." }, { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": readable.cacheControl
    }
  });
}
