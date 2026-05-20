import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";
import { EMAIL_EVENTS, enqueueManyAndTrySend, getAdminNotificationEmails, getSiteUrl } from "@/lib/email";
import { buildContactRequestEmail } from "@/lib/email/templates";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";
import { createNotificationsForPermission, NOTIFICATION_EVENTS } from "@/lib/notifications";
import { PUBLIC_REQUEST_TYPES, getCategoryForRequestType, getRequestWorkflow } from "@/lib/tickets";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload) {
  const name = normalizeText(payload?.name);
  const workEmail = normalizeText(payload?.workEmail).toLowerCase();
  const organization = normalizeText(payload?.organization);
  const subject = normalizeText(payload?.subject);
  const requestType = normalizeText(payload?.requestType);
  const message = normalizeText(payload?.message);
  const locale = normalizeText(payload?.locale) || "zh-CN";

  if (!name || !workEmail || !requestType || !message) {
    return { error: "Please fill in all required fields." };
  }

  if (!EMAIL_PATTERN.test(workEmail)) {
    return { error: "Please enter a valid work email." };
  }

  if (!PUBLIC_REQUEST_TYPES.has(requestType)) {
    return { error: "Please choose a valid request type." };
  }

  return {
    data: {
      name,
      workEmail,
      organization: organization || null,
      subject: subject || null,
      requestType,
      message,
      locale
    }
  };
}

async function queueContactRequestEmails(ticket, adminPath = "/zh-CN/admin/contact/") {
  const recipients = getAdminNotificationEmails();
  if (!recipients.length) return false;

  try {
    const email = buildContactRequestEmail({
      ticket,
      adminUrl: new URL(adminPath, getSiteUrl()).toString()
    });

    await enqueueManyAndTrySend(recipients.map((recipient) => ({
      eventType: EMAIL_EVENTS.contactRequestSubmitted,
      to: recipient,
      subject: email.subject,
      text: email.text,
      html: email.html,
      relatedType: "contact_request",
      relatedId: ticket.id,
      metadata: { requestType: ticket.requestType }
    })));

    return true;
  } catch (error) {
    console.error("Failed to queue contact request email", error);
    return false;
  }
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const validation = validatePayload(payload);

  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const user = await getCurrentUser();
  const { name, organization, subject, requestType, message, locale } = validation.data;
  const workEmail = user?.email ? user.email.toLowerCase() : validation.data.workEmail;
  const workflow = getRequestWorkflow(requestType);
  const category = getCategoryForRequestType(requestType);
  const permission = workflow === "support" ? ADMIN_PERMISSIONS.support : ADMIN_PERMISSIONS.contact;
  const adminPath = workflow === "support" ? `/${locale}/admin/support/` : `/${locale}/admin/contact/`;

  try {
    const pool = getPostgresPool();

    const result = await pool.query(
      `insert into public.contact_requests
        (user_id, name, work_email, organization, subject, request_type, category, message)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [user?.id || null, name, workEmail, organization, subject, requestType, category, message]
    );

    const ticket = {
      id: result.rows[0]?.id,
      name,
      workEmail,
      organization,
      subject,
      requestType,
      category,
      message
    };

    await recordUserFootprint({
      userId: user?.id,
      actorUserId: user?.id,
      eventType: USER_FOOTPRINT_EVENTS.contactSubmitted,
      summary: "User submitted a contact request.",
      relatedType: "contact_request",
      relatedId: ticket.id,
      metadata: { requestType }
    });

    const emailQueued = await queueContactRequestEmails(ticket, adminPath);
    await createNotificationsForPermission(permission, {
      eventType: NOTIFICATION_EVENTS.contactRequestSubmitted,
      title: workflow === "support" ? "新的支持工单" : "新的联系请求",
      body: `${name} 提交了${workflow === "support" ? "支持工单" : "联系请求"}：${subject || requestType}`,
      relatedType: "contact_request",
      relatedId: ticket.id,
      metadata: { requestType, workflow },
      url: adminPath,
      sendEmail: false
    });

    return NextResponse.json({ ok: true, emailQueued }, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact request", error);

    return NextResponse.json(
      { error: "We could not submit your request right now. Please try again later." },
      { status: 500 }
    );
  }
}
