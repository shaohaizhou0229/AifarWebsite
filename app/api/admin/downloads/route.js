import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { listAdminDownloadPlatforms } from "@/lib/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin(getProfile);
    const platforms = await listAdminDownloadPlatforms();
    return NextResponse.json({ platforms });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
}
