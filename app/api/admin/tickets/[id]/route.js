import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/admin-permissions";
import { getAdminTicket, getRequestWorkflow, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, updateTicketFields } from "@/lib/tickets";
import { createNotification, NOTIFICATION_EVENTS } from "@/lib/notifications";

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

function assertTicketPermission(profile, ticket) {
  const workflow = getRequestWorkflow(ticket?.requestType);
  const permission = workflow === "support" ? ADMIN_PERMISSIONS.support : ADMIN_PERMISSIONS.contact;
  if (!hasAdminPermission(profile, permission)) {
    throw new AdminRequiredError("Administrator permission required.");
  }
}

export async function GET(_request, { params }) {
  try {
    const { profile } = await requireAdmin(getProfile);
    const { id } = await params;
    const result = await getAdminTicket(id);

    if (!result) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    assertTicketPermission(profile, result.ticket);
    return NextResponse.json(result);
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to load ticket." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { user, profile } = await requireAdmin(getProfile);
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

    const before = await getAdminTicket(id);
    if (!before) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    assertTicketPermission(profile, before.ticket);
    const ticket = await updateTicketFields(id, input, user);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const assigneeChanged = Object.prototype.hasOwnProperty.call(input, "assigneeUserId")
      && ticket.assigneeUserId
      && ticket.assigneeUserId !== before?.ticket?.assigneeUserId;
    if (assigneeChanged) {
      await createNotification({
        recipientUserId: ticket.assigneeUserId,
        eventType: NOTIFICATION_EVENTS.ticketAssigned,
        title: "你被分配了支持工单",
        body: `支持工单「${ticket.subject || ticket.name || ticket.workEmail}」已分配给你。`,
        relatedType: "contact_request",
        relatedId: ticket.id,
        metadata: { assignedByUserId: user.id },
        url: `/zh-CN/admin/tickets/${ticket.id}/`,
        sendEmail: false
      });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to update ticket." }, { status: 500 });
  }
}
