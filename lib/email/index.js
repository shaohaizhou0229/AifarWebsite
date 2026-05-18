import { getPostgresPool } from "@/lib/db";

const MAX_RETRIES = 3;

export const EMAIL_EVENTS = {
  userInvitation: "user.invitation",
  contactRequestSubmitted: "contact.request_submitted",
  ticketReplied: "ticket.replied",
  ticketStatusUpdated: "ticket.status_updated",
  downloadPublished: "download.published"
};

function getProvider() {
  return String(process.env.EMAIL_PROVIDER || "disabled").trim().toLowerCase();
}

function getEmailFrom() {
  return process.env.EMAIL_FROM || "";
}

function getReplyTo() {
  return process.env.EMAIL_REPLY_TO || "";
}

export function getSiteUrl() {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getAdminNotificationEmails() {
  return String(process.env.ADMIN_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function canQueueEmail(toEmail) {
  return Boolean(cleanEmail(toEmail));
}

export async function sendEmail({ to, subject, text, html }) {
  const provider = getProvider();
  const from = getEmailFrom();
  const replyTo = getReplyTo();

  if (provider === "disabled") {
    return { skipped: true, provider, reason: "Email provider is disabled." };
  }

  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error?.message || "Resend email send failed.");
    }

    return { provider, messageId: payload.id || "" };
  }

  if (provider === "smtp") {
    const nodemailerModule = await import("nodemailer");
    const nodemailer = nodemailerModule.default || nodemailerModule;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: process.env.SMTP_USER || process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });

    const result = await transport.sendMail({
      from,
      to,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {})
    });

    return { provider, messageId: result.messageId || "" };
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

export async function enqueueEmail(input) {
  const toEmail = cleanEmail(input.to);
  if (!canQueueEmail(toEmail)) {
    return { queued: false, notification: null };
  }

  const provider = getProvider();
  const disabled = provider === "disabled";
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.email_notifications
      (event_type, to_email, subject, html_content, text_content, status, provider, related_type, related_id, metadata, failure_reason)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
     returning *`,
    [
      input.eventType,
      toEmail,
      input.subject,
      input.html,
      input.text,
      disabled ? "canceled" : "pending",
      provider,
      input.relatedType || null,
      input.relatedId || null,
      JSON.stringify(normalizeMetadata(input.metadata)),
      disabled ? "Email provider is disabled." : null
    ]
  );

  return { queued: !disabled, notification: result.rows[0] };
}

export async function enqueueEmails(inputs) {
  const results = [];
  for (const input of inputs) {
    results.push(await enqueueEmail(input));
  }
  return results;
}

export async function processEmailQueue({ limit = 10, ids = [] } = {}) {
  const pool = getPostgresPool();
  const params = [];
  const where = [
    "(status = 'pending' or (status = 'failed' and retry_count < $1))",
    "scheduled_at <= now()"
  ];
  params.push(MAX_RETRIES);

  if (ids.length) {
    params.push(ids);
    where.push(`id = any($${params.length}::uuid[])`);
  }

  params.push(limit);
  const result = await pool.query(
    `select *
     from public.email_notifications
     where ${where.join(" and ")}
     order by created_at asc
     limit $${params.length}`,
    params
  );

  const processed = [];
  for (const notification of result.rows) {
    await pool.query(
      `update public.email_notifications
       set status = 'sending', updated_at = now()
       where id = $1`,
      [notification.id]
    );

    try {
      const sendResult = await sendEmail({
        to: notification.to_email,
        subject: notification.subject,
        text: notification.text_content,
        html: notification.html_content
      });

      if (sendResult.skipped) {
        await pool.query(
          `update public.email_notifications
           set status = 'canceled', failure_reason = $2, updated_at = now()
           where id = $1`,
          [notification.id, sendResult.reason]
        );
        processed.push({ id: notification.id, status: "canceled" });
        continue;
      }

      await pool.query(
        `update public.email_notifications
         set status = 'sent', provider = $2, provider_message_id = $3, sent_at = now(), failure_reason = null, updated_at = now()
         where id = $1`,
        [notification.id, sendResult.provider, sendResult.messageId || null]
      );
      processed.push({ id: notification.id, status: "sent" });
    } catch (error) {
      await pool.query(
        `update public.email_notifications
         set status = 'failed', retry_count = retry_count + 1, failure_reason = $2, updated_at = now()
         where id = $1`,
        [notification.id, error.message || "Email send failed."]
      );
      processed.push({ id: notification.id, status: "failed", error: error.message });
    }
  }

  return processed;
}

export async function enqueueAndTrySend(input) {
  const result = await enqueueEmail(input);
  if (result.notification?.id && result.queued) {
    await processEmailQueue({ ids: [result.notification.id], limit: 1 });
  }
  return result;
}

export async function enqueueManyAndTrySend(inputs) {
  const results = await enqueueEmails(inputs);
  const ids = results.map((result) => result.notification?.id).filter(Boolean);
  if (ids.length) {
    await processEmailQueue({ ids, limit: ids.length });
  }
  return results;
}
