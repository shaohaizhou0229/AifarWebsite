import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { TICKET_STATUSES, updateTicketFields } from "@/lib/tickets";

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

export async function PATCH(request, { params }) {
  try {
    const { user } = await requireAdminPermission(getProfile, ADMIN_PERMISSIONS.support);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const status = typeof payload.status === "string" ? payload.status : "";

    if (!TICKET_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid ticket status." }, { status: 400 });
    }

    const ticket = await updateTicketFields(id, { status }, user);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to update ticket." }, { status: 500 });
  }
}
