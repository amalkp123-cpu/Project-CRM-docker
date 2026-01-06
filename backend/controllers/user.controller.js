// controllers/profile.controller.js
const { pool } = require("../database/db");

exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sql = `
      SELECT id AS userid, username, full_name, role, created_at
      FROM app_users
      WHERE id = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(sql, [
      req.params.id ? req.params.id : req.user.id,
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Optional: restrict to admin
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }

    const sql = `
      SELECT
        id AS userid,
        username,
        full_name,
        role,
        created_at
      FROM app_users
      ORDER BY created_at DESC;
    `;

    const { rows } = await pool.query(sql);

    return res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const targetUserId =
      req.user.role === "admin" && req.params.id ? req.params.id : req.user.id;

    const { username, full_name, role } = req.body || {};

    // Prevent role escalation by non-admins
    if (role && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const sql = `
      UPDATE app_users
      SET
        username = COALESCE($1, username),
        full_name = COALESCE($2, full_name),
        role = COALESCE($3, role)
      WHERE id = $4
      RETURNING id AS userid, username, full_name, role, created_at;
    `;

    const { rows } = await pool.query(sql, [
      username || null,
      full_name || null,
      role || null,
      targetUserId,
    ]);

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "User id required" });
    }

    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const sql = `
      DELETE FROM app_users
      WHERE id = $1
      RETURNING id;
    `;

    const { rows } = await pool.query(sql, [userId]);

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ deleted: true, userid: rows[0].id });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ error: err.message });
  }
};
