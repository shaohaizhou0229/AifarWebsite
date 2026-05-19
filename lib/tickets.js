import { getPostgresPool } from "@/lib/db";
import { findProfileByEmail } from "@/lib/profiles";
import { recordUserFootprint, USER_FOOTPRINT_EVENTS } from "@/lib/user-footprints";

export const TICKET_STATUSES = new Set(["new", "in_progress", "waiting_customer", "resolved", "closed"]);
export const TICKET_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
export const TICKET_CATEGORIES = new Set(["account_access", "client_download", "installation", "product_usage", "bug_report", "partnership", "other"]);

export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
    priority: row.priority || "normal",
    category: row.category || "other",
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.assignee_name,
    assigneeEmail: row.assignee_email,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRepliedAt: row.last_replied_at,
    resolvedAt: row.resolved_at,
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

export function mapInternalNote(row) {
  return {
    id: row.id,
    contactRequestId: row.contact_request_id,
    authorUserId: row.author_user_id,
    message: row.message,
    createdAt: row.created_at,
    authorName: row.author_name,
    authorEmail: row.author_email
  };
}

function ticketSelect() {
  return `select cr.*,
    assignee.display_name as assignee_name,
    assignee.email as assignee_email
   from public.contact_requests cr
   left join public.profiles assignee on assignee.id = cr.assignee_user_id`;
}

export async function listUserTickets(user) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `${ticketSelect()}
     where cr.user_id = $1 or lower(cr.work_email) = lower($2)
     order by cr.created_at desc`,
    [user.id, user.email]
  );

  return result.rows.map(mapTicket);
}

export async function getUserTicket(user, ticketId) {
  const pool = getPostgresPool();
  const ticketResult = await pool.query(
    `${ticketSelect()}
     where cr.id = $1 and (cr.user_id = $2 or lower(cr.work_email) = lower($3))`,
    [ticketId, user.id, user.email]
  );

  const ticket = ticketResult.rows[0];
  if (!ticket) return null;

  const replies = await listReplies(ticket.id);
  return { ticket: mapTicket(ticket), replies };
}

function normalizeTicketFilters(input = {}) {
  if (typeof input === "string") {
    return { status: input };
  }
  return input || {};
}

export async function listAdminTickets(input = {}) {
  const filters = normalizeTicketFilters(input);
  const pool = getPostgresPool();
  const params = [];
  const where = [];

  if (filters.status && TICKET_STATUSES.has(filters.status)) {
    params.push(filters.status);
    where.push(`cr.status = $${params.length}`);
  }

  if (filters.priority && TICKET_PRIORITIES.has(filters.priority)) {
    params.push(filters.priority);
    where.push(`cr.priority = $${params.length}`);
  }

  if (filters.category && TICKET_CATEGORIES.has(filters.category)) {
    params.push(filters.category);
    where.push(`cr.category = $${params.length}`);
  }

  if (filters.assignee === "unassigned") {
    where.push("cr.assignee_user_id is null");
  } else if (isUuid(filters.assignee)) {
    params.push(filters.assignee);
    where.push(`cr.assignee_user_id = $${params.length}`);
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(
      cr.subject ilike $${params.length}
      or cr.name ilike $${params.length}
      or cr.work_email ilike $${params.length}
      or cr.organization ilike $${params.length}
      or cr.message ilike $${params.length}
    )`);
  }

  const result = await pool.query(
    `${ticketSelect()}
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by coalesce(cr.updated_at, cr.created_at) desc`,
    params
  );

  return result.rows.map(mapTicket);
}

export async function getAdminTicketStats() {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select
      count(*) filter (where status in ('new', 'waiting_customer'))::int as pending_count,
      count(*) filter (where status = 'in_progress')::int as in_progress_count,
      count(*) filter (where created_at >= date_trunc('day', now()))::int as today_count,
      count(*) filter (where status = 'closed')::int as closed_count
     from public.contact_requests`
  );
  const row = result.rows[0] || {};
  return {
    pending: row.pending_count || 0,
    inProgress: row.in_progress_count || 0,
    today: row.today_count || 0,
    closed: row.closed_count || 0
  };
}

export async function listAdminTicketsForUser(profile) {
  if (!profile?.id || !profile?.email) return [];

  const pool = getPostgresPool();
  const result = await pool.query(
    `${ticketSelect()}
     where cr.user_id = $1 or lower(cr.work_email) = lower($2)
     order by cr.created_at desc`,
    [profile.id, profile.email]
  );

  return result.rows.map(mapTicket);
}

export async function getAdminTicket(ticketId) {
  const pool = getPostgresPool();
  const ticketResult = await pool.query(
    `${ticketSelect()}
     where cr.id = $1`,
    [ticketId]
  );

  const ticket = ticketResult.rows[0];
  if (!ticket) return null;

  const replies = await listReplies(ticket.id);
  const internalNotes = await listInternalNotes(ticket.id);
  return { ticket: mapTicket(ticket), replies, internalNotes };
}

export async function getTicketOwnerProfile(ticketId) {
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

export async function listInternalNotes(ticketId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select n.*, p.display_name as author_name, p.email as author_email
     from public.contact_request_internal_notes n
     left join public.profiles p on p.id = n.author_user_id
     where n.contact_request_id = $1
     order by n.created_at asc`,
    [ticketId]
  );

  return result.rows.map(mapInternalNote);
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

export async function addInternalNote(ticketId, adminUser, message) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.contact_request_internal_notes
      (contact_request_id, author_user_id, message)
     values
      ($1, $2, $3)
     returning *`,
    [ticketId, adminUser.id, message]
  );

  return mapInternalNote(result.rows[0]);
}

export async function updateTicketFields(ticketId, input, actorUser = null) {
  const pool = getPostgresPool();
  const fields = [];
  const params = [ticketId];

  if (typeof input.status === "string" && TICKET_STATUSES.has(input.status)) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
    fields.push(`resolved_at = case when $${params.length} = 'resolved' then now() when $${params.length} in ('new', 'in_progress', 'waiting_customer') then null else resolved_at end`);
    fields.push(`closed_at = case when $${params.length} = 'closed' then now() when $${params.length} <> 'closed' then null else closed_at end`);
  }

  if (typeof input.priority === "string" && TICKET_PRIORITIES.has(input.priority)) {
    params.push(input.priority);
    fields.push(`priority = $${params.length}`);
  }

  if (typeof input.category === "string" && TICKET_CATEGORIES.has(input.category)) {
    params.push(input.category);
    fields.push(`category = $${params.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(input, "assigneeUserId")) {
    params.push(isUuid(input.assigneeUserId) ? input.assigneeUserId : null);
    fields.push(`assignee_user_id = $${params.length}`);
  }

  if (!fields.length) {
    return getAdminTicket(ticketId).then((result) => result?.ticket || null);
  }

  const result = await pool.query(
    `update public.contact_requests cr
     set ${fields.join(", ")},
      updated_at = now()
     where cr.id = $1
     returning cr.*,
      (select display_name from public.profiles where id = cr.assignee_user_id) as assignee_name,
      (select email from public.profiles where id = cr.assignee_user_id) as assignee_email`,
    params
  );

  const ticket = result.rows[0] ? mapTicket(result.rows[0]) : null;

  if (ticket && actorUser?.id && typeof input.status === "string") {
    const owner = await getTicketOwnerProfile(ticketId);
    await recordUserFootprint({
      userId: owner?.id,
      actorUserId: actorUser.id,
      eventType: USER_FOOTPRINT_EVENTS.ticketStatusUpdated,
      summary: `Ticket status changed to ${input.status}.`,
      relatedType: "contact_request",
      relatedId: ticketId,
      metadata: { status: input.status }
    });
  }

  return ticket;
}

export async function updateTicketStatus(ticketId, status, actorUser = null) {
  return updateTicketFields(ticketId, { status }, actorUser);
}
