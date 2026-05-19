import { EMAIL_EVENTS, enqueueAndTrySend, getSiteUrl } from "@/lib/email";
import { buildNotificationEmail } from "@/lib/email/templates";
import { ADMIN_PERMISSION_VALUES } from "@/lib/admin-permissions";
import { getPostgresPool } from "@/lib/db";

export const NOTIFICATION_EVENTS = {
  contactRequestSubmitted: "contact.request_submitted",
  collaborationSpaceMemberAdded: "collaboration.space_member_added",
  collaborationSubtaskAssigned: "collaboration.subtask_assigned",
  collaborationSubtaskDueSoon: "collaboration.subtask_due_soon",
  collaborationSubtaskOverdue: "collaboration.subtask_overdue",
  collaborationSubtaskBlocked: "collaboration.subtask_blocked",
  collaborationSubtaskCompleted: "collaboration.subtask_completed",
  collaborationRecurringTaskCreated: "collaboration.recurring_task_created",
  downloadPublished: "download.published",
  ticketAssigned: "ticket.assigned",
  ticketReplied: "ticket.replied",
  ticketStatusUpdated: "ticket.status_updated",
  userInvitationCreated: "user.invitation_created",
  userInvitationCanceled: "user.invitation_canceled",
  userUpdated: "user.updated",
  userDeleted: "user.deleted",
  userTestAccountReset: "user.test_account_reset"
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  inApp: true
};

function isMissingNotificationSchemaError(error) {
  const message = String(error?.message || "");
  return error?.code === "42P01"
    || error?.code === "42703"
    || message.includes("public.notifications")
    || message.includes("notification_preferences");
}

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
    url: row.url || "",
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

function absoluteNotificationUrl(url) {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return getSiteUrl();

  try {
    return new URL(value, getSiteUrl()).toString();
  } catch {
    return getSiteUrl();
  }
}

async function getRecipient(userId) {
  const pool = getPostgresPool();
  let result;

  try {
    result = await pool.query(
      `select id, email, display_name, notification_preferences
       from public.profiles
       where id = $1 and account_status = 'active'`,
      [userId]
    );
  } catch (error) {
    if (!isMissingNotificationSchemaError(error)) throw error;
    result = await pool.query(
      `select id, email, display_name
       from public.profiles
       where id = $1 and account_status = 'active'`,
      [userId]
    );
  }

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

  try {
    const result = await pool.query(
      `update public.profiles
       set notification_preferences = $2::jsonb,
        updated_at = now()
       where id = $1
       returning notification_preferences`,
      [userId, JSON.stringify(preferences)]
    );
    return normalizePreferences(result.rows[0]?.notification_preferences);
  } catch (error) {
    if (isMissingNotificationSchemaError(error)) return DEFAULT_NOTIFICATION_PREFERENCES;
    throw error;
  }
}

export async function createNotification({
  recipientUserId,
  eventType,
  title,
  body,
  relatedType = null,
  relatedId = null,
  metadata = {},
  url = "",
  sendEmail = true
}) {
  const recipient = await getRecipient(recipientUserId);
  if (!recipient) {
    return { inAppCreated: false, emailQueued: false };
  }

  const pool = getPostgresPool();
  let notification = null;

  if (recipient.notificationPreferences.inApp) {
    try {
      const result = await pool.query(
        `insert into public.notifications
          (recipient_user_id, event_type, title, body, related_type, related_id, metadata, url)
         values
          ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         returning *`,
        [
          recipientUserId,
          eventType,
          title,
          body,
          relatedType,
          relatedId,
          JSON.stringify(metadata && typeof metadata === "object" ? metadata : {}),
          typeof url === "string" ? url.trim() : ""
        ]
      );
      notification = mapNotification(result.rows[0]);
    } catch (error) {
      if (!isMissingNotificationSchemaError(error)) {
        console.error("Failed to create in-app notification", error);
      }
    }
  }

  let emailQueued = false;
  if (sendEmail && recipient.notificationPreferences.email && recipient.email) {
    const email = buildNotificationEmail({
      title,
      body,
      actionUrl: absoluteNotificationUrl(url)
    });
    try {
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
    } catch (error) {
      console.error("Failed to queue notification email", error);
    }
  }

  return { inAppCreated: Boolean(notification), emailQueued, notification };
}

export async function listActiveAdminsByPermission(permission) {
  if (!ADMIN_PERMISSION_VALUES.includes(permission)) return [];

  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, admin_permissions
     from public.profiles
     where role = 'admin'
       and account_status = 'active'
       and admin_permissions @> array[$1]::text[]
     order by coalesce(display_name, email) asc`,
    [permission]
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    adminPermissions: row.admin_permissions || []
  }));
}

export async function createNotificationsForUsers(recipientUserIds, notification) {
  const ids = Array.from(new Set((recipientUserIds || []).filter(Boolean)));
  const results = [];

  for (const recipientUserId of ids) {
    try {
      results.push(await createNotification({ ...notification, recipientUserId }));
    } catch (error) {
      console.error("Failed to create notification for user", error);
      results.push({ inAppCreated: false, emailQueued: false, error: error.message });
    }
  }

  return results;
}

export async function createNotificationsForPermission(permission, notification) {
  try {
    const admins = await listActiveAdminsByPermission(permission);
    return createNotificationsForUsers(admins.map((admin) => admin.id), notification);
  } catch (error) {
    console.error("Failed to create notifications for permission", error);
    return [];
  }
}

export async function listNotifications(userId, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const pool = getPostgresPool();

  try {
    const result = await pool.query(
      `select *
       from public.notifications
       where recipient_user_id = $1
       order by created_at desc
       limit $2`,
      [userId, safeLimit]
    );
    return result.rows.map(mapNotification);
  } catch (error) {
    if (isMissingNotificationSchemaError(error)) return [];
    throw error;
  }
}

export async function countUnreadNotifications(userId) {
  const pool = getPostgresPool();

  try {
    const result = await pool.query(
      `select count(*)::int as count
       from public.notifications
       where recipient_user_id = $1 and read_at is null`,
      [userId]
    );
    return Number(result.rows[0]?.count || 0);
  } catch (error) {
    if (isMissingNotificationSchemaError(error)) return 0;
    throw error;
  }
}

export async function markNotificationRead(userId, notificationId) {
  const pool = getPostgresPool();

  try {
    const result = await pool.query(
      `update public.notifications
       set read_at = coalesce(read_at, now())
       where id = $1 and recipient_user_id = $2
       returning *`,
      [notificationId, userId]
    );
    return mapNotification(result.rows[0]);
  } catch (error) {
    if (isMissingNotificationSchemaError(error)) return null;
    throw error;
  }
}

export async function markAllNotificationsRead(userId) {
  const pool = getPostgresPool();

  try {
    const result = await pool.query(
      `update public.notifications
       set read_at = coalesce(read_at, now())
       where recipient_user_id = $1 and read_at is null
       returning *`,
      [userId]
    );
    return result.rows.map(mapNotification);
  } catch (error) {
    if (isMissingNotificationSchemaError(error)) return [];
    throw error;
  }
}
