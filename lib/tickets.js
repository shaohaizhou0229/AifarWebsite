import { getPostgresPool } from "@/lib/db";
import { findProfileByEmail } from "@/lib/profiles";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const TICKET_STATUSES = new Set(["new", "in_progress", "closed"]);

export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function mapTicket(row) {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    name: row.name,
    workEmail: row.work_email,
    organization: row.organization,
    requestType: row.request_type,
    message: row.message,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRepliedAt: row.last_replied_at,
    closedAt: row.closed_at
  };
}

export function mapReply(row) {
  return {
    id: row.id,
    contactRequestId: row.contact_request_id,
    authorUserId: row.author_user_id,
    authorRole: row.author_role,
    message: row.message,
    createdAt: row.created_at,
    authorName: row.author_name,
    authorEmail: row.author_email
  };
}

export async function listUserTickets(user) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.contact_requests
     where user_id = $1 or lower(work_email) = lower($2)
     order by created_at desc`,
    [user.id, user.email]
  );

  return result.rows.map(mapTicket);
}

export async function getUserTicket(user, ticketId) {
  const pool = getPostgresPool();
  const ticketResult = await pool.query(
    `select *
     from public.contact_requests
     where id = $1 and (user_id = $2 or lower(work_email) = lower($3))`,
    [ticketId, user.id, user.email]
  );

  const ticket = ticketResult.rows[0];
  if (!ticket) return null;

  const replies = await listReplies(ticket.id);
  return { ticket: mapTicket(ticket), replies };
}

export async function listAdminTickets(status) {
  const pool = getPostgresPool();
  const params = [];
  let where = "";

  if (status && TICKET_STATUSES.has(status)) {
    params.push(status);
    where = "where status = $1";
  }

  const result = await pool.query(
    `select *
     from public.contact_requests
     ${where}
     order by created_at desc`,
    params
  );

  return result.rows.map(mapTicket);
}

export async function listAdminTicketsForUser(profile) {
  if (!profile?.id || !profile?.email) return [];

  const pool = getPostgresPool();
  const result = await pool.query(
    `select *
     from public.contact_requests
     where user_id = $1 or lower(work_email) = lower($2)
     order by created_at desc`,
    [profile.id, profile.email]
  );

  return result.rows.map(mapTicket);
}

export async function getAdminTicket(ticketId) {
  const pool = getPostgresPool();
  const ticketResult = await pool.query(
    `select *
     from public.contact_requests
     where id = $1`,
    [ticketId]
  );

  const ticket = ticketResult.rows[0];
  if (!ticket) return null;

  const replies = await listReplies(ticket.id);
  return { ticket: mapTicket(ticket), replies };
}

async function getTicketOwnerProfile(ticketId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select cr.user_id, cr.work_email, p.id as profile_id, p.email as profile_email
     from public.contact_requests cr
     left join public.profiles p on p.id = cr.user_id
     where cr.id = $1`,
    [ticketId]
  );
  const row = result.rows[0];
  if (!row) return null;

  if (row.profile_id) {
    return { id: row.profile_id, email: row.profile_email };
  }

  return findProfileByEmail(row.work_email);
}

export async function listReplies(ticketId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select r.*, p.display_name as author_name, p.email as author_email
     from public.contact_request_replies r
     left join public.profiles p on p.id = r.author_user_id
     where r.contact_request_id = $1
     order by r.created_at asc`,
    [ticketId]
  );

  return result.rows.map(mapReply);
}

export async function addAdminReply(ticketId, adminUser, message) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `insert into public.contact_request_replies
        (contact_request_id, author_user_id, author_role, message)
       values
        ($1, $2, 'admin', $3)`,
      [ticketId, adminUser.id, message]
    );

    await client.query(
      `update public.contact_requests
       set
        status = case when status = 'new' then 'in_progress' else status end,
        last_replied_at = now(),
        updated_at = now()
       where id = $1`,
      [ticketId]
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  const owner = await getTicketOwnerProfile(ticketId);
  await recordUserFootprint({
    userId: owner?.id,
    actorUserId: adminUser.id,
    eventType: USER_FOOTPRINT_EVENTS.ticketReplied,
    summary: "Aifar team replied to a contact request.",
    relatedType: "contact_request",
    relatedId: ticketId
  });
}

export async function updateTicketStatus(ticketId, status, actorUser = null) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.contact_requests
     set status = $2,
      closed_at = case when $2 = 'closed' then now() else null end,
      updated_at = now()
     where id = $1
     returning *`,
    [ticketId, status]
  );

  const ticket = result.rows[0] ? mapTicket(result.rows[0]) : null;

  if (ticket && actorUser?.id) {
    const owner = await getTicketOwnerProfile(ticketId);
    await recordUserFootprint({
      userId: owner?.id,
      actorUserId: actorUser.id,
      eventType: USER_FOOTPRINT_EVENTS.ticketStatusUpdated,
      summary: `Ticket status changed to ${status}.`,
      relatedType: "contact_request",
      relatedId: ticketId,
      metadata: { status }
    });
  }

  return ticket;
}
