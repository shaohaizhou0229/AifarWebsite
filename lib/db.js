import pg from "pg";

const { Pool } = pg;

const globalForPostgres = globalThis;

function normalizeConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
      url.port = "6543";
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function normalizePoolMax(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getPostgresPool() {
  const connectionString = normalizeConnectionString(process.env.SUPABASE_DB_POOL_URL || "");

  if (!connectionString) {
    throw new Error("SUPABASE_DB_POOL_URL is not configured.");
  }

  if (!globalForPostgres.aifarPostgresPool) {
    const pool = new Pool({
      connectionString,
      max: normalizePoolMax(process.env.SUPABASE_DB_POOL_MAX || 1),
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

export function isDatabaseConnectionLimitError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("emaxconnsession") || message.includes("max clients reached") || message.includes("remaining connection slots are reserved");
}
