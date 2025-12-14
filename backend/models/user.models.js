// models/user.models.js
const { pool } = require("../database/db");

const createUser = async (username, fullName, passwordHash, role) => {
  try {
    const sql = `
      INSERT INTO app_users (username, full_name, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const params = [username, fullName, passwordHash, role || null];
    const { rows } = await pool.query(sql, params);
    return rows[0] || null;
  } catch (err) {
    throw err;
  }
};

const findUserByUsername = async (username) => {
  try {
    const sql = `
      SELECT id AS id, username, password_hash, role
      FROM app_users
      WHERE username = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [username]);
    return rows[0] || null;
  } catch (err) {
    throw err;
  }
};

module.exports = { createUser, findUserByUsername };
