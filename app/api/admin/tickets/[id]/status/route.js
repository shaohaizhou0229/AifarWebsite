import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdminPermission } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { getTicketOwnerProfile, TICKET_STATUSES, updateTicketFields } from "@/lib/tickets";
import { EMAIL_EVENTS, enqueueAndTrySend, getSiteUrl } from "@/lib/email";
import { buildTicketStatusEmail } from "@/lib/email/templates";
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

const NOTIFIED_STATUSES = new Set(["waiting_customer", "resolved", "closed"]);

async function queueTicketStatusEmail(ticket, status) {
  if (!NOTIFIED_STATUSES.has(status) || !ticket?.workEmail) return false;

  try {
    const email = buildTicketStatusEmail({
      ticket,
      status,
      ticketUrl: new URL(`/zh-CN/account/tickets/${ticket.id}/`, getSiteUrl()).toString()
    });

    const result = await enqueueAndTrySend({
      eventType: EMAIL_EVENTS.ticketStatusUpdated,
      to: ticket.workEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
      relatedType: "contact_request",
      relatedId: ticket.id,
      metadata: { status }
    });

    return Boolean(result.queued);
  } catch (error) {
    console.error("Failed to queue ticket status email", error);
    return false;
  }
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

    const emailQueued = await queueTicketStatusEmail(ticket, status);
    if (NOTIFIED_STATUSES.has(status)) {
      const owner = await getTicketOwnerProfile(ticket.id);
      if (owner?.id) {
        await createNotification({
          recipientUserId: owner.id,
          eventType: NOTIFICATION_EVENTS.ticketStatusUpdated,
          title: "工单状态已更新",
          body: `你的支持工单状态已更新为 ${status}。`,
          relatedType: "contact_request",
          relatedId: ticket.id,
          metadata: { status },
          url: `/zh-CN/account/tickets/${ticket.id}/`,
          sendEmail: false
        });
      }
    }
    return NextResponse.json({ ticket, emailQueued });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to update ticket." }, { status: 500 });
  }
}
