import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
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
    await requireAdmin(getProfile);
    const searchParams = new URL(request.url).searchParams;
    const filters = {
      status: searchParams.get("status") || "",
      priority: searchParams.get("priority") || "",
      category: searchParams.get("category") || "",
      assignee: searchParams.get("assignee") || "",
      q: searchParams.get("q") || ""
    };
    const [tickets, stats] = await Promise.all([
      listAdminTickets(filters),
      getAdminTicketStats()
    ]);
    return NextResponse.json({ tickets, stats });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}
