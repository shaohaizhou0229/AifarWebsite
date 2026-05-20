import { getPostgresPool } from "@/lib/db";
import { ADMIN_PERMISSIONS, allAdminPermissions, normalizeAdminPermissions } from "@/lib/admin-permissions";

export const PROFILE_ROLES = new Set(["user", "admin"]);
export const ACCOUNT_STATUSES = new Set(["active", "deactivated", "deleted"]);

export function isProfileActive(profile) {
  return !profile || !profile.accountStatus || profile.accountStatus === "active";
}

function mapProfile(row) {
  if (!row) return null;
  const adminPermissions = normalizeAdminPermissions(row.admin_permissions);
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    display_name: row.display_name,
    organization: row.organization,
    jobTitle: row.job_title,
    job_title: row.job_title,
    countryRegion: row.country_region,
    country_region: row.country_region,
    phone: row.phone,
    role: row.role,
    adminPermissions,
    admin_permissions: adminPermissions,
    accountStatus: row.account_status || "active",
    account_status: row.account_status || "active",
    deletedAt: row.deleted_at,
    deleted_at: row.deleted_at,
    deletedByUserId: row.deleted_by_user_id,
    deleted_by_user_id: row.deleted_by_user_id,
    deletionReason: row.deletion_reason,
    deletion_reason: row.deletion_reason,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    ticketCount: row.ticket_count ? Number(row.ticket_count) : 0,
    lastFootprintAt: row.last_footprint_at,
    last_footprint_at: row.last_footprint_at,
    recordType: row.record_type || "user"
  };
}

function mapInvitation(row) {
  if (!row) return null;
  const adminPermissions = normalizeAdminPermissions(row.admin_permissions);
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    organization: row.organization,
    jobTitle: row.job_title,
    countryRegion: row.country_region,
    phone: row.phone,
    role: row.role,
    adminPermissions,
    accountStatus: row.status || "pending",
    status: row.status || "pending",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    invitedByUserId: row.invited_by_user_id,
    acceptedByUserId: row.accepted_by_user_id,
    acceptedAt: row.accepted_at,
    canceledAt: row.canceled_at,
    recordType: "invitation"
  };
}

function normalizeRole(value) {
  const role = String(value || "user");
  if (!PROFILE_ROLES.has(role)) {
    throw new Error("Invalid role.");
  }
  return role;
}

function normalizeAccountStatus(value) {
  const status = String(value || "active");
  if (!ACCOUNT_STATUSES.has(status)) {
    throw new Error("Invalid account status.");
  }
  return status;
}

function normalizePermissionsForRole(role, value) {
  return role === "admin" ? normalizeAdminPermissions(value) : [];
}

async function getPendingInvitationByEmail(email, client = null) {
  const pool = client || getPostgresPool();
  const result = await pool.query(
    `select *
     from public.user_invitations
     where lower(email) = lower($1)
       and status = 'pending'
     order by created_at desc
     limit 1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function ensureProfile(user, input = {}) {
  const pool = getPostgresPool();
  const email = String(user.email || input.email || "").toLowerCase();
  const displayName = input.displayName || input.display_name || user.user_metadata?.display_name || user.user_metadata?.name || null;
  const invitation = email ? await getPendingInvitationByEmail(email) : null;
  const role = invitation?.role || "user";
  const adminPermissions = normalizePermissionsForRole(role, invitation?.admin_permissions);

  const result = await pool.query(
    `insert into public.profiles
      (id, email, display_name, organization, job_title, country_region, phone, role, admin_permissions, account_status)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
     on conflict (id) do update set
      email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      organization = coalesce(public.profiles.organization, excluded.organization),
      job_title = coalesce(public.profiles.job_title, excluded.job_title),
      country_region = coalesce(public.profiles.country_region, excluded.country_region),
      phone = coalesce(public.profiles.phone, excluded.phone),
      role = case
        when public.profiles.role = 'user' and excluded.role = 'admin' then excluded.role
        else public.profiles.role
      end,
      admin_permissions = case
        when public.profiles.role = 'user' and excluded.role = 'admin' then excluded.admin_permissions
        when public.profiles.role = 'admin' and cardinality(public.profiles.admin_permissions) = 0 then excluded.admin_permissions
        else public.profiles.admin_permissions
      end,
      account_status = case
        when public.profiles.account_status = 'deleted' then public.profiles.account_status
        else 'active'
      end,
      updated_at = now()
     returning *`,
    [
      user.id,
      email,
      displayName || invitation?.display_name || null,
      input.organization || invitation?.organization || null,
      input.jobTitle || input.job_title || invitation?.job_title || null,
      input.countryRegion || input.country_region || invitation?.country_region || null,
      input.phone || invitation?.phone || null,
      role,
      adminPermissions
    ]
  );

  if (invitation) {
    await pool.query(
      `update public.user_invitations
       set status = 'accepted',
        accepted_by_user_id = $2,
        accepted_at = now(),
        updated_at = now()
       where id = $1`,
      [invitation.id, user.id]
    );
  }

  return mapProfile(result.rows[0]);
}

export async function getProfile(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, organization, job_title, country_region, phone, role,
      admin_permissions, account_status, deleted_at, deleted_by_user_id, deletion_reason, created_at, updated_at
     from public.profiles
     where id = $1`,
    [userId]
  );

  return mapProfile(result.rows[0]);
}

export async function listAdminProfiles() {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, admin_permissions
     from public.profiles
     where role = 'admin' and account_status = 'active'
     order by coalesce(display_name, email) asc`
  );

  return result.rows.map((profile) => ({
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    adminPermissions: normalizeAdminPermissions(profile.admin_permissions)
  }));
}

export async function findProfileByEmail(email) {
  const normalizedEmail = String(email || "").toLowerCase();
  if (!normalizedEmail) return null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, organization, job_title, country_region, phone, role,
      admin_permissions, account_status, deleted_at, deleted_by_user_id, deletion_reason, created_at, updated_at
     from public.profiles
     where lower(email) = lower($1)`,
    [normalizedEmail]
  );

  return mapProfile(result.rows[0]);
}

export async function listAdminUsers(query = "", status = "all", options = {}) {
  const pool = getPostgresPool();
  const q = String(query || "").trim();
  const safeStatus = ["all", "active", "deactivated", "deleted", "pending"].includes(status) ? status : "all";
  const limit = Math.min(Math.max(Number(options.limit || 50), 1), 100);
  const params = [];
  const where = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`(lower(p.email) like $${params.length}
      or lower(coalesce(p.display_name, '')) like $1
      or lower(coalesce(p.organization, '')) like $1)`);
  }

  if (safeStatus !== "all" && safeStatus !== "pending") {
    params.push(safeStatus);
    where.push(`p.account_status = $${params.length}`);
  }

  const result = await pool.query(
    `select p.*, 'user' as record_type,
      count(distinct cr.id) as ticket_count,
      max(f.created_at) as last_footprint_at
     from public.profiles p
     left join public.contact_requests cr on cr.user_id = p.id or lower(cr.work_email) = lower(p.email)
     left join public.user_footprints f on f.user_id = p.id
     ${where.length ? `where ${where.join(" and ")}` : ""}
       group by p.id
       order by coalesce(max(f.created_at), p.updated_at, p.created_at) desc
       limit $${params.length + 1}`,
      [...params, limit]
  );

  const users = result.rows.map(mapProfile);

  if (safeStatus !== "all" && safeStatus !== "pending") {
    return users;
  }

  const inviteParams = [];
  const inviteWhere = ["status = 'pending'"];
  if (q) {
    inviteParams.push(`%${q.toLowerCase()}%`);
    inviteWhere.push(`(lower(email) like $1 or lower(coalesce(display_name, '')) like $1 or lower(coalesce(organization, '')) like $1)`);
  }

  const invitations = await pool.query(
    `select *
     from public.user_invitations
       where ${inviteWhere.join(" and ")}
       order by created_at desc
       limit $${inviteParams.length + 1}`,
      [...inviteParams, limit]
    );

  return [...invitations.rows.map(mapInvitation), ...users].slice(0, limit);
}

export async function getAdminUser(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select p.*,
      count(distinct cr.id) as ticket_count,
      max(f.created_at) as last_footprint_at
     from public.profiles p
     left join public.contact_requests cr on cr.user_id = p.id or lower(cr.work_email) = lower(p.email)
     left join public.user_footprints f on f.user_id = p.id
     where p.id = $1
     group by p.id`,
    [userId]
  );

  return mapProfile(result.rows[0]);
}

export async function countAdminProfiles() {
  const pool = getPostgresPool();
  const result = await pool.query("select count(*)::int as count from public.profiles where role = 'admin' and account_status = 'active'");
  return Number(result.rows[0]?.count || 0);
}

export async function countUserManagementAdmins(excludingUserId = null) {
  const pool = getPostgresPool();
  const params = [];
  let exclude = "";
  if (excludingUserId) {
    params.push(excludingUserId);
    exclude = "and id <> $1";
  }
  const result = await pool.query(
    `select count(*)::int as count
     from public.profiles
     where role = 'admin'
       and account_status = 'active'
       and admin_permissions @> array['${ADMIN_PERMISSIONS.users}']::text[]
       ${exclude}`,
    params
  );
  return Number(result.rows[0]?.count || 0);
}

export async function updateAdminUserProfile(targetUserId, input) {
  const role = normalizeRole(input.role);
  const accountStatus = normalizeAccountStatus(input.accountStatus || "active");
  const adminPermissions = normalizePermissionsForRole(role, input.adminPermissions);

  const pool = getPostgresPool();
  const current = await getAdminUser(targetUserId);
  if (!current) return null;

  const removesUserManagement = current.role === "admin"
    && current.accountStatus === "active"
    && current.adminPermissions.includes(ADMIN_PERMISSIONS.users)
    && (role !== "admin" || accountStatus !== "active" || !adminPermissions.includes(ADMIN_PERMISSIONS.users));

  if (removesUserManagement && await countUserManagementAdmins(targetUserId) <= 0) {
    throw new Error("The last user-management administrator cannot be changed.");
  }

  const result = await pool.query(
    `update public.profiles
     set
      display_name = $2,
      organization = $3,
      job_title = $4,
      country_region = $5,
      phone = $6,
      role = $7,
      admin_permissions = $8,
      account_status = $9,
      updated_at = now()
     where id = $1
     returning *`,
    [
      targetUserId,
      input.displayName || null,
      input.organization || null,
      input.jobTitle || null,
      input.countryRegion || null,
      input.phone || null,
      role,
      adminPermissions,
      accountStatus
    ]
  );

  return mapProfile(result.rows[0]);
}

export async function softDeleteAdminUser(targetUserId, actorUserId, reason = "") {
  const current = await getAdminUser(targetUserId);
  if (!current) return null;

  if (
    current.role === "admin"
    && current.accountStatus === "active"
    && current.adminPermissions.includes(ADMIN_PERMISSIONS.users)
    && await countUserManagementAdmins(targetUserId) <= 0
  ) {
    throw new Error("The last user-management administrator cannot be deleted.");
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.profiles
     set account_status = 'deleted',
      deleted_at = now(),
      deleted_by_user_id = $2,
      deletion_reason = $3,
      updated_at = now()
     where id = $1
     returning *`,
    [targetUserId, actorUserId || targetUserId, reason || null]
  );
  return mapProfile(result.rows[0]);
}

export function canResetTestAccount(profile) {
  const email = String(profile?.email || "").toLowerCase();
  return profile?.accountStatus === "deleted" || email.includes("+aifar-test");
}

export async function assertCanResetTestAccount(targetUserId, actorUserId) {
  const current = await getAdminUser(targetUserId);
  if (!current) return null;

  if (targetUserId === actorUserId) {
    throw new Error("The current signed-in account cannot be reset.");
  }

  if (!canResetTestAccount(current)) {
    throw new Error("Only deleted accounts or test-tagged accounts can be reset.");
  }

  if (
    current.role === "admin"
    && current.accountStatus === "active"
    && current.adminPermissions.includes(ADMIN_PERMISSIONS.users)
    && await countUserManagementAdmins(targetUserId) <= 0
  ) {
    throw new Error("The last user-management administrator cannot be reset.");
  }

  return current;
}

function buildArchivedEmail(userId) {
  return `deleted+${String(userId).toLowerCase()}@archive.aifar.local`;
}

export async function resetTestAccount(targetUserId, actorUserId, reason = "") {
  const current = await assertCanResetTestAccount(targetUserId, actorUserId);
  if (!current) return null;

  const originalEmail = current.email;
  const archivedEmail = buildArchivedEmail(targetUserId);
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `update public.profiles
       set email = $2,
        account_status = 'deleted',
        deleted_at = coalesce(deleted_at, now()),
        deleted_by_user_id = coalesce(deleted_by_user_id, $3),
        deletion_reason = $4,
        updated_at = now()
       where id = $1`,
      [targetUserId, archivedEmail, actorUserId, reason || "UAT test account reset"]
    );

    const invitations = await client.query(
      `update public.user_invitations
       set status = 'canceled',
        canceled_at = now(),
        canceled_by_user_id = $2,
        updated_at = now()
       where lower(email) = lower($1)
        and status = 'pending'
       returning id`,
      [originalEmail, actorUserId]
    );

    await client.query("commit");

    return {
      user: await getAdminUser(targetUserId),
      originalEmail,
      archivedEmail,
      canceledInvitationCount: invitations.rowCount || 0
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function selfDeleteProfile(user, reason = "") {
  return softDeleteAdminUser(user.id, user.id, reason || "Self-service account deletion.");
}

export async function updateProfile(user, input) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.profiles
      (id, email, display_name, organization, job_title, country_region, phone)
     values
      ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      organization = excluded.organization,
      job_title = excluded.job_title,
      country_region = excluded.country_region,
      phone = excluded.phone,
      updated_at = now()
     returning *`,
    [
      user.id,
      user.email.toLowerCase(),
      input.displayName || null,
      input.organization || null,
      input.jobTitle || null,
      input.countryRegion || null,
      input.phone || null
    ]
  );

  return mapProfile(result.rows[0]);
}

export async function createUserInvitation(input, invitedByUserId) {
  const role = normalizeRole(input.role);
  const adminPermissions = normalizePermissionsForRole(role, input.adminPermissions);
  const email = String(input.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required.");
  }

  const existing = await findProfileByEmail(email);
  if (existing && existing.accountStatus !== "deleted") {
    throw new Error("A user with this email already exists.");
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    `insert into public.user_invitations
      (email, display_name, organization, job_title, country_region, phone, role, admin_permissions, invited_by_user_id)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (lower(email)) where status = 'pending' do update set
      display_name = excluded.display_name,
      organization = excluded.organization,
      job_title = excluded.job_title,
      country_region = excluded.country_region,
      phone = excluded.phone,
      role = excluded.role,
      admin_permissions = excluded.admin_permissions,
      invited_by_user_id = excluded.invited_by_user_id,
      updated_at = now()
     returning *`,
    [
      email,
      input.displayName || null,
      input.organization || null,
      input.jobTitle || null,
      input.countryRegion || null,
      input.phone || null,
      role,
      adminPermissions,
      invitedByUserId
    ]
  );

  return mapInvitation(result.rows[0]);
}

export async function getUserInvitation(invitationId) {
  const pool = getPostgresPool();
  const result = await pool.query("select * from public.user_invitations where id = $1", [invitationId]);
  return mapInvitation(result.rows[0]);
}

export async function cancelUserInvitation(invitationId, canceledByUserId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `update public.user_invitations
     set status = 'canceled',
      canceled_at = now(),
      canceled_by_user_id = $2,
      updated_at = now()
     where id = $1
       and status = 'pending'
     returning *`,
    [invitationId, canceledByUserId]
  );
  return mapInvitation(result.rows[0]);
}

export { allAdminPermissions };
