import pg from "pg";

const { Pool } = pg;

const globalForPostgres = globalThis;

export function getPostgresPool() {
  const connectionString = process.env.SUPABASE_DB_POOL_URL;

  if (!connectionString) {
    throw new Error("SUPABASE_DB_POOL_URL is not configured.");
  }

  if (!globalForPostgres.aifarPostgresPool) {
    globalForPostgres.aifarPostgresPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false }
    });
  }

  return globalForPostgres.aifarPostgresPool;
}
