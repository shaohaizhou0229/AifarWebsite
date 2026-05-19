import { EMAIL_EVENTS, enqueueAndTrySend, getSiteUrl } from "@/lib/email";
import { buildNotificationEmail } from "@/lib/email/templates";
import { getPostgresPool } from "@/lib/db";

export const NOTIFICATION_EVENTS = {
  collaborationSpaceMemberAdded: "collaboration.space_member_added",
  collaborationSubtaskAssigned: "collaboration.subtask_assigned",
  collaborationSubtaskDueSoon: "collaboration.subtask_due_soon",
  collaborationSubtaskOverdue: "collaboration.subtask_overdue",
  collaborationSubtaskBlocked: "collaboration.subtask_blocked",
  collaborationSubtaskCompleted: "collaboration.subtask_completed",
  collaborationRecurringTaskCreated: "collaboration.recurring_task_created"
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  inApp: true
};

function normalizePreferences(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    email: source.email !== false,
    inApp: source.inApp !== false
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    relatedType: row.related_type,
    relatedId: row.related_id,
    metadata: row.metadata || {},
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

async function getRecipient(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, notification_preferences
     from public.profiles
     where id = $1 and account_status = 'active'`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    notificationPreferences: normalizePreferences(row.notification_preferences)
  };
}

export async function getNotificationPreferences(userId) {
  const recipient = await getRecipient(userId);
  return recipient?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function updateNotificationPreferences(userId, input = {}) {
  const preferences = normalizePreferences(input);
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.profiles
     set notification_preferences = $2::jsonb,
      updated_at = now()
     where id = $1
     returning notification_preferences`,
    [userId, JSON.stringify(preferences)]
  );
  return normalizePreferences(result.rows[0]?.notification_preferences);
}

export async function createNotification({
  recipientUserId,
  eventType,
  title,
  body,
  relatedType = null,
  relatedId = null,
  metadata = {},
  url = ""
}) {
  const recipient = await getRecipient(recipientUserId);
  if (!recipient) {
    return { inAppCreated: false, emailQueued: false };
  }

  const pool = getPostgresPool();
  let notification = null;

  if (recipient.notificationPreferences.inApp) {
    const result = await pool.query(
      `insert into public.notifications
        (recipient_user_id, event_type, title, body, related_type, related_id, metadata)
       values
        ($1, $2, $3, $4, $5, $6, $7::jsonb)
       returning *`,
      [
        recipientUserId,
        eventType,
        title,
        body,
        relatedType,
        relatedId,
        JSON.stringify(metadata && typeof metadata === "object" ? metadata : {})
      ]
    );
    notification = mapNotification(result.rows[0]);
  }

  let emailQueued = false;
  if (recipient.notificationPreferences.email && recipient.email) {
    const email = buildNotificationEmail({
      title,
      body,
      actionUrl: url || getSiteUrl()
    });
    const result = await enqueueAndTrySend({
      eventType: EMAIL_EVENTS.notification,
      to: recipient.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      relatedType,
      relatedId,
      metadata: { ...metadata, eventType }
    });
    emailQueued = Boolean(result.queued);
  }

  return { inAppCreated: Boolean(notification), emailQueued, notification };
}

export async function listNotifications(userId, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.notifications
     where recipient_user_id = $1
     order by created_at desc
     limit $2`,
    [userId, safeLimit]
  );
  return result.rows.map(mapNotification);
}

export async function countUnreadNotifications(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select count(*)::int as count
     from public.notifications
     where recipient_user_id = $1 and read_at is null`,
    [userId]
  );
  return Number(result.rows[0]?.count || 0);
}

export async function markNotificationRead(userId, notificationId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.notifications
     set read_at = coalesce(read_at, now())
     where id = $1 and recipient_user_id = $2
     returning *`,
    [notificationId, userId]
  );
  return mapNotification(result.rows[0]);
}

export async function markAllNotificationsRead(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.notifications
     set read_at = coalesce(read_at, now())
     where recipient_user_id = $1 and read_at is null
     returning *`,
    [userId]
  );
  return result.rows.map(mapNotification);
}
