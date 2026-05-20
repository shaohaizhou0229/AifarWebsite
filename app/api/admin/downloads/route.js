import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdminPermission } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { listAdminDownloadPlatforms } from "@/lib/downloads";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const timing = createServerTiming();
  try {
    await timing.measure("auth", () => requireAdminPermission(getProfile, ADMIN_PERMISSIONS.downloads));
    const platforms = await timing.measure("downloads", () => listAdminDownloadPlatforms());
    return adminJson({ platforms }, { headers: timing.headers() });
  } catch (error) {
    if (error instanceof AdminRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
}
