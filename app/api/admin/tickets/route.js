import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { listAdminTickets } from "@/lib/tickets";

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
    const status = new URL(request.url).searchParams.get("status") || "";
    const tickets = await listAdminTickets(status);
    return NextResponse.json({ tickets });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}
