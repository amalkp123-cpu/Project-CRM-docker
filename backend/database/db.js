const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "password",
  database: process.env.PG_NAME || "crm",
  port: process.env.PG_PORT || 5432,
  max: 10, // same as connectionLimit
  idleTimeoutMillis: 0,
});

const initializeDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, "../database/schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    const client = await pool.connect();

    try {
      await client.query(schemaSQL);

      console.log("Schema applied successfully");

      // require the seeder here to avoid circular deps and run it
      const { seedAdmin } = require("../database/seedAdmin");
      await seedAdmin(pool);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};

module.exports = { pool, initializeDatabase };
