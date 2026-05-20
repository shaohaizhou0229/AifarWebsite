import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { adminJson } from "@/lib/admin-response";
import { getProfile, listAdminProfiles } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getAdminTicketStats, listAdminTickets } from "@/lib/tickets";

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
  try {
    await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.support);
    const searchParams = new URL(request.url).searchParams;
    const filters = {
      status: searchParams.get("status") || "",
      priority: searchParams.get("priority") || "",
      category: searchParams.get("category") || "",
      assignee: searchParams.get("assignee") || "",
      q: searchParams.get("q") || ""
    };
    const [tickets, stats, profiles] = await Promise.all([
      listAdminTickets(filters),
      getAdminTicketStats(),
      listAdminProfiles()
    ]);
    return adminJson({ tickets, stats, profiles });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}
