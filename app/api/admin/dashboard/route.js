import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getAdminDashboardOverview } from "@/lib/admin-dashboard";
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

export async function GET(request) {
  try {
    const context = await requireAdmin(getProfile);
    const searchParams = new URL(request.url).searchParams;
    const range = Number(searchParams.get("range") || 7);
    const dashboard = await getAdminDashboardOverview({ userId: context.user.id, analyticsDays: range });

    return NextResponse.json({ dashboard });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load dashboard." }, { status: 500 });
  }
}
