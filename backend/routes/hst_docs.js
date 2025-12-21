// src/routes/hstDocs.js
const express = require("express");
const upload = require("../middleware/upload");
const crypto = require("crypto");
const fs = require("fs");
const { pool } = require("../database/db");
const path = require("path");

const router = express.Router();

router.post("/:taxRecordId", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });

  const { taxRecordId } = req.params;
  const { clientId, notes } = req.body;

  const checksum = crypto
    .createHash("sha256")
    .update(fs.readFileSync(req.file.path))
    .digest("hex");

  await pool.query(
    `
      INSERT INTO hst_docs (
        client_id,
        tax_record_id,
        filename,
        object_store_key,
        uploaded_by,
        checksum,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
    [
      clientId,
      taxRecordId,
      req.file.originalname,
      req.file.filename,
      req.user.id, // assuming auth middleware
      checksum,
      notes || null,
    ]
  );

  res.json({ ok: true });
});

router.get("/file/:docId", async (req, res) => {
  const docId = req.params.docId.trim();

  const { rows } = await pool.query(
    `
    SELECT object_store_key, client_id
    FROM hst_docs
    WHERE id = $1
    `,
    [docId]
  );

  if (!rows.length) return res.sendStatus(404);

  // ownership check
  if (!["admin", "auditor"].includes(req.user.role)) {
    return res.sendStatus(403);
  }
  const filePath = path.resolve(
    __dirname,
    "../uploads/hst_docs",
    rows[0].object_store_key
  );

  res.sendFile(filePath);
});

module.exports = router;
