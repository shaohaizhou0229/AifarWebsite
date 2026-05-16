import { getPostgresPool } from "@/lib/db";

export const USER_FOOTPRINT_EVENTS = {
  registered: "auth.registered",
  loggedIn: "auth.logged_in",
  oauthLoggedIn: "auth.oauth_logged_in",
  profileUpdated: "profile.updated",
  adminUserUpdated: "admin.user_updated",
  contactSubmitted: "contact.submitted",
  ticketReplied: "ticket.replied",
  ticketStatusUpdated: "ticket.status_updated",
  downloadStarted: "download.started"
};

function mapFootprint(row) {
  return {
    id: row.id,
    userId: row.user_id,
    actorUserId: row.actor_user_id,
    eventType: row.event_type,
    summary: row.summary,
    relatedType: row.related_type,
    relatedId: row.related_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    actorName: row.actor_name,
    actorEmail: row.actor_email
  };
}

export async function recordUserFootprint({
  userId,
  actorUserId = null,
  eventType,
  summary,
  relatedType = null,
  relatedId = null,
  metadata = {}
}) {
  if (!userId || !eventType || !summary) return null;

  try {
    const pool = getPostgresPool();
    const result = await pool.query(
      `insert into public.user_footprints
        (user_id, actor_user_id, event_type, summary, related_type, related_id, metadata)
       values
        ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [userId, actorUserId || null, eventType, summary, relatedType, relatedId, metadata]
    );

    return mapFootprint(result.rows[0]);
  } catch (error) {
    console.error("Failed to record user footprint", error);
    return null;
  }
}

export async function listUserFootprints(userId, limit = 50) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select f.*, p.display_name as actor_name, p.email as actor_email
     from public.user_footprints f
     left join public.profiles p on p.id = f.actor_user_id
     where f.user_id = $1
     order by f.created_at desc
     limit $2`,
    [userId, limit]
  );

  return result.rows.map(mapFootprint);
}
