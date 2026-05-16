import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/auth";
import { isPublishedSiteImage, SITE_CONTENT_BUCKET } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeStoragePath(parts = []) {
  const storagePath = parts.map((part) => decodeURIComponent(part)).join("/");
  if (!storagePath || storagePath.includes("..") || storagePath.startsWith("/")) return "";
  return storagePath;
}

export async function GET(_request, { params }) {
  const { path = [] } = await params;
  const storagePath = normalizeStoragePath(path);

  if (!storagePath || !(await isPublishedSiteImage(storagePath))) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.storage.from(SITE_CONTENT_BUCKET).download(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Image not found." }, { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
    }
  });
}
