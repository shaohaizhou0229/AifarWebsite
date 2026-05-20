import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { getProfile, listAdminProfiles } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminTicketStatsByScope, listAdminTickets } from "@/lib/tickets";
import { createServerTiming } from "@/lib/server-timing";

export const runtime = "nodejs";

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
    const searchParams = new URL(request.url).searchParams;
    const scope = searchParams.get("scope") === "contact" ? "contact" : "support";
    const permission = scope === "contact" ? ADMIN_PERMISSIONS.contact : ADMIN_PERMISSIONS.support;
    await timing.measure("auth", () => requireAdminPermission(getProfile, permission));
    const filters = {
      scope,
      status: searchParams.get("status") || "",
      priority: searchParams.get("priority") || "",
      category: searchParams.get("category") || "",
      assignee: searchParams.get("assignee") || "",
      q: searchParams.get("q") || "",
      limit: searchParams.get("limit") || 20
    };
    const [tickets, stats, profiles] = await Promise.all([
      timing.measure("tickets", () => listAdminTickets(filters)),
      timing.measure("stats", () => getAdminTicketStatsByScope(scope)),
      timing.measure("profiles", () => listAdminProfiles())
    ]);
    return adminJson({ tickets, stats, profiles }, { headers: timing.headers() });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}
