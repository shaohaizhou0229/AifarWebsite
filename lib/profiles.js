import { getPostgresPool } from "@/lib/db";

export const PROFILE_ROLES = new Set(["user", "admin"]);

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    organization: row.organization,
    jobTitle: row.job_title,
    countryRegion: row.country_region,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ticketCount: row.ticket_count ? Number(row.ticket_count) : 0,
    lastFootprintAt: row.last_footprint_at
  };
}

export async function ensureProfile(user, input = {}) {
  const pool = getPostgresPool();
  const email = String(user.email || input.email || "").toLowerCase();
  const displayName = input.displayName || input.display_name || user.user_metadata?.display_name || user.user_metadata?.name || null;

  const result = await pool.query(
    `insert into public.profiles
      (id, email, display_name, organization, job_title, country_region, phone)
     values
      ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set
      email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      organization = coalesce(public.profiles.organization, excluded.organization),
      job_title = coalesce(public.profiles.job_title, excluded.job_title),
      country_region = coalesce(public.profiles.country_region, excluded.country_region),
      phone = coalesce(public.profiles.phone, excluded.phone),
      updated_at = now()
     returning *`,
    [
      user.id,
      email,
      displayName,
      input.organization || null,
      input.jobTitle || input.job_title || null,
      input.countryRegion || input.country_region || null,
      input.phone || null
    ]
  );

  return result.rows[0];
}

export async function getProfile(userId) {
  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, organization, job_title, country_region, phone, role, created_at, updated_at
     from public.profiles
     where id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function findProfileByEmail(email) {
  const normalizedEmail = String(email || "").toLowerCase();
  if (!normalizedEmail) return null;

  const pool = getPostgresPool();
  const result = await pool.query(
    `select id, email, display_name, organization, job_title, country_region, phone, role, created_at, updated_at
     from public.profiles
     where lower(email) = lower($1)`,
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

export async function listAdminUsers(query = "") {
  const pool = getPostgresPool();
  const q = String(query || "").trim();
  const params = [];
  let where = "";

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where = `where lower(p.email) like $1
      or lower(coalesce(p.display_name, '')) like $1
      or lower(coalesce(p.organization, '')) like $1`;
  }

  const result = await pool.query(
    `select p.*,
      count(distinct cr.id) as ticket_count,
      max(f.created_at) as last_footprint_at
     from public.profiles p
     left join public.contact_requests cr on cr.user_id = p.id or lower(cr.work_email) = lower(p.email)
     left join public.user_footprints f on f.user_id = p.id
     ${where}
     group by p.id
     order by coalesce(max(f.created_at), p.updated_at, p.created_at) desc`,
    params
  );

  return result.rows.map(mapProfile);
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
  const result = await pool.query("select count(*)::int as count from public.profiles where role = 'admin'");
  return Number(result.rows[0]?.count || 0);
}

export async function updateAdminUserProfile(targetUserId, input) {
  const role = String(input.role || "user");
  if (!PROFILE_ROLES.has(role)) {
    throw new Error("Invalid role.");
  }

  const pool = getPostgresPool();
  const current = await getAdminUser(targetUserId);
  if (!current) return null;

  if (current.role === "admin" && role !== "admin") {
    const adminCount = await countAdminProfiles();
    if (adminCount <= 1) {
      throw new Error("The last administrator cannot be downgraded.");
    }
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
      updated_at = now()
     where id = $1
     returning id, email, display_name, organization, job_title, country_region, phone, role, created_at, updated_at`,
    [
      targetUserId,
      input.displayName || null,
      input.organization || null,
      input.jobTitle || null,
      input.countryRegion || null,
      input.phone || null,
      role
    ]
  );

  return result.rows[0] || null;
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
     returning id, email, display_name, organization, job_title, country_region, phone, role, created_at, updated_at`,
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

  return result.rows[0];
}
