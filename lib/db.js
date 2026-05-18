import pg from "pg";

const { Pool } = pg;

const globalForPostgres = globalThis;

export function getPostgresPool() {
  const connectionString = process.env.SUPABASE_DB_POOL_URL;

  if (!connectionString) {
    throw new Error("SUPABASE_DB_POOL_URL is not configured.");
  }

  if (!globalForPostgres.aifarPostgresPool) {
    const pool = new Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 15000,
      maxLifetimeSeconds: 60,
      keepAlive: true,
      allowExitOnIdle: true,
      ssl: { rejectUnauthorized: false }
    });

    pool.on("error", () => {
      if (globalForPostgres.aifarPostgresPool === pool) {
        globalForPostgres.aifarPostgresPool = null;
      }
    });

    globalForPostgres.aifarPostgresPool = pool;
  }

  return globalForPostgres.aifarPostgresPool;
}
