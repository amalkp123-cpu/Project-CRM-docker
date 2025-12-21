// controllers/profile.controller.js
const { pool } = require("../database/db");

exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sql = `
      SELECT id AS userid, username, full_name, role, created_at
      FROM app_users
      WHERE id = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(sql, [req.user.userid]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ error: err.message });
  }
};
