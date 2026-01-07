const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const isProd = process.env.NODE_ENV === "production";

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // REQUIRED on Render
        max: 10,
      }
    : {
        host: process.env.PG_HOST || "db",
        user: process.env.PG_USER || "postgres",
        password: process.env.PG_PASSWORD || "password",
        database: process.env.PG_NAME || "crm",
        port: Number(process.env.PG_PORT) || 5432,
        max: 10,
      }
);

async function initializeDatabase() {
  // 🚫 Never auto-run schema in production
  if (isProd) {
    console.log("Skipping DB init in production");
    return;
  }

  const schemaPath = path.join(__dirname, "../database/schema.sql");
  const schemaSQL = fs.readFileSync(schemaPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query(schemaSQL);
    console.log("Schema applied");

    const { seedAdmin } = require("../database/seedAdmin");
    await seedAdmin(pool);
    console.log("Admin seeded");
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
};
