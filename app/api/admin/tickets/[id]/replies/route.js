import { NextResponse } from "next/server";
import { AdminRequiredError, AuthRequiredError, requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/admin-permissions";
import { addAdminReply, getAdminTicket, getRequestWorkflow, getTicketOwnerProfile, normalizeText } from "@/lib/tickets";
import { EMAIL_EVENTS, enqueueAndTrySend, getSiteUrl } from "@/lib/email";
import { buildTicketReplyEmail } from "@/lib/email/templates";
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

async function queueTicketReplyEmail(ticketId, message, adminUser) {
  try {
    const detail = await getAdminTicket(ticketId);
    const ticket = detail?.ticket;
    if (!ticket?.workEmail) return false;

    const email = buildTicketReplyEmail({
      ticket,
      replyMessage: message,
      ticketUrl: new URL(`/zh-CN/account/tickets/${ticketId}/`, getSiteUrl()).toString()
    });

    const result = await enqueueAndTrySend({
      eventType: EMAIL_EVENTS.ticketReplied,
      to: ticket.workEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
      relatedType: "contact_request",
      relatedId: ticketId,
      metadata: { adminUserId: adminUser.id }
    });

    return Boolean(result.queued);
  } catch (error) {
    console.error("Failed to queue ticket reply email", error);
    return false;
  }
}

export async function POST(request, { params }) {
  try {
    const { user, profile } = await requireAdmin(getProfile);
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const message = normalizeText(payload.message);

    if (!message) {
      return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
    }

    const detail = await getAdminTicket(id);
    if (!detail) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    assertTicketPermission(profile, detail.ticket);
    await addAdminReply(id, user, message);
    const emailQueued = await queueTicketReplyEmail(id, message, user);
    const owner = await getTicketOwnerProfile(id);
    if (owner?.id) {
      await createNotification({
        recipientUserId: owner.id,
        eventType: NOTIFICATION_EVENTS.ticketReplied,
        title: "工单有新的回复",
        body: "Aifar 团队已回复你的支持工单。",
        relatedType: "contact_request",
        relatedId: id,
        metadata: { adminUserId: user.id },
        url: `/zh-CN/account/tickets/${id}/`,
        sendEmail: false
      });
    }
    return NextResponse.json({ ok: true, emailQueued }, { status: 201 });
  } catch (error) {
    return permissionError(error) || NextResponse.json({ error: "Unable to add reply." }, { status: 500 });
  }
}
