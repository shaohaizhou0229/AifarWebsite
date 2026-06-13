import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { getAdminDashboardOverview } from "@/lib/admin-dashboard";
import { getProfile } from "@/lib/profiles";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeRange(value) {
  return Number(value) === 1 ? 1 : 7;
}

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
    const context = await timing.measure("auth", () => requireAdmin(getProfile));
    const searchParams = new URL(request.url).searchParams;
    const trafficRange = searchParams.has("trafficRange")
      ? safeRange(searchParams.get("trafficRange"))
      : safeRange(searchParams.get("range"));
    const downloadRange = searchParams.has("downloadRange")
      ? safeRange(searchParams.get("downloadRange"))
      : 7;
    const dashboard = await timing.measure("data", () => getAdminDashboardOverview({
      userId: context.user.id,
      trafficAnalyticsDays: trafficRange,
      downloadAnalyticsDays: downloadRange
    }));

    return adminJson({ dashboard }, { headers: timing.headers() });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load dashboard." }, { status: 500 });
  }
}
