const bcrypt = require("bcrypt");
const { pool } = require("./db");

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const name = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;
  const role = process.env.ADMIN_ROLE || "admin";

  if (!username || !password) {
    console.log("Admin seed skipped: missing env vars");
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO app_users (username, full_name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO NOTHING`,
    [username, name, hash, role]
  );

  console.log("Admin user ensured.");
}

module.exports = { seedAdmin };
