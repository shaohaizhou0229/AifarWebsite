import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { getAdminTicket, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, updateTicketFields } from "@/lib/tickets";

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

export async function GET(_request, { params }) {
  try {
    await requireAdmin(getProfile);
    const { id } = await params;
    const result = await getAdminTicket(id);

    if (!result) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load ticket." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(getProfile);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const input = {};

    if (Object.prototype.hasOwnProperty.call(payload, "status")) {
      if (!TICKET_STATUSES.has(payload.status)) {
        return NextResponse.json({ error: "Invalid ticket status." }, { status: 400 });
      }
      input.status = payload.status;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "priority")) {
      if (!TICKET_PRIORITIES.has(payload.priority)) {
        return NextResponse.json({ error: "Invalid ticket priority." }, { status: 400 });
      }
      input.priority = payload.priority;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "category")) {
      if (!TICKET_CATEGORIES.has(payload.category)) {
        return NextResponse.json({ error: "Invalid ticket category." }, { status: 400 });
      }
      input.category = payload.category;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "assigneeUserId")) {
      input.assigneeUserId = typeof payload.assigneeUserId === "string" ? payload.assigneeUserId : "";
    }

    const ticket = await updateTicketFields(id, input);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to update ticket." }, { status: 500 });
  }
}
