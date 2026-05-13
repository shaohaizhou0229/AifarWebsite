const fs = require("fs");
const pg = require("pg");

const migration = process.argv[2];

if (!migration) {
  console.error("Usage: node tools/apply-migration.js <migration.sql>");
  process.exit(1);
}

function readEnvValue(name) {
  const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  const line = env.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  if (!line) return process.env[name] || "";
  return line.slice(line.indexOf("=") + 1).replace(/^"|"$/g, "");
}

async function main() {
  const connectionString = readEnvValue("SUPABASE_DB_POOL_URL");

  if (!connectionString) {
    throw new Error("SUPABASE_DB_POOL_URL is not configured.");
  }

  const sql = fs.readFileSync(migration, "utf8");
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(sql);
    console.log(`Applied migration: ${migration}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
