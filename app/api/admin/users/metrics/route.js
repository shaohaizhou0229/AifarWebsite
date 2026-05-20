import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminUserMetrics, getProfile } from "@/lib/profiles";
import { createServerTiming } from "@/lib/server-timing";

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

export async function GET(request) {
  const timing = createServerTiming();
  try {
    await timing.measure("auth", () => requireAdminPermission(getProfile, ADMIN_PERMISSIONS.users));
    const searchParams = new URL(request.url).searchParams;
    const ids = String(searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean);
    const metrics = await timing.measure("metrics", () => getAdminUserMetrics(ids));
    return adminJson({ metrics }, { headers: timing.headers() });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load user metrics." }, { status: 500 });
  }
}
