import { getPostgresPool } from "@/lib/db";

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
