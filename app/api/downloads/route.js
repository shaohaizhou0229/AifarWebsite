import { NextResponse } from "next/server";
import { listPublicDownloadPlatforms } from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const platforms = await listPublicDownloadPlatforms();
  return NextResponse.json({ platforms });
}
