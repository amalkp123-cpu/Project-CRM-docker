const { pool } = require("../database/db");
const { encrypt, sha256 } = require("../utils/crypto-utils");

function nullify(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function normalizeQuarter(q) {
  if (q === undefined || q === null) return null;

  if (typeof q === "number") {
    return q >= 1 && q <= 4 ? q : null;
  }

  if (typeof q === "string") {
    const m = q
      .trim()
      .toUpperCase()
      .match(/^Q([1-4])$/);
    if (m) return Number(m[1]);
  }

  return null;
}

const TAX_TYPE_MAP = {
  hst: "HST",
  corporate: "CORPORATION",
  corporation: "CORPORATION",
  payroll: "PAYROLL",
  wsib: "WSIB",
  audit: "AUDIT",
  annualRenewal: "ANNUAL_RENEWAL",
};

async function listClients(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "50", 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`bc.business_name ILIKE $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const dataSql = `
      SELECT
        bc.id,
        bc.business_name,
        bc.business_number,
        bc.business_type,
        bc.email,
        bc.phone_cell,
        bc.created_at
      FROM business_clients bc
      ${whereSql}
      ORDER BY bc.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const dataRes = await pool.query(dataSql, [...params, limit, offset]);

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM business_clients bc ${whereSql}`,
      params
    );

    res.json({
      data: dataRes.rows,
      meta: {
        total: Number(countRes.rows[0].count),
        page,
        per_page: limit,
      },
    });
  } catch (err) {
    console.error("listBusinessClients:", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function createBusiness(req, res) {
  const payload = req.body || {};
  const createdBy = req.user?.id;
  if (!createdBy) return res.status(401).json({ error: "unauthenticated" });

  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");
    const now = new Date();

    /* ---------- business_clients ---------- */
    const bcRes = await conn.query(
      `
      INSERT INTO business_clients (
        business_name,
        business_number,
        business_type,
        incorporation_date,
        incorporation_jurisdiction,
        fiscal_year_end,
        ontario_corp_number,
        phone_cell,
        phone_home,
        phone_work,
        fax,
        email,
        loyalty_since,
        referred_by,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id
      `,
      [
        payload.businessName,
        payload.businessNumber,
        payload.businessType,
        payload.incorporationDate,
        payload.incorporationJurisdiction,
        payload.fiscalYearEnd,
        payload.ontarioCorpNumber,
        payload.phone1,
        payload.phone2,
        payload.phone3,
        payload.fax,
        payload.email,
        payload.loyaltySince,
        payload.referredBy,
        createdBy,
        createdBy,
        now,
        now,
      ]
    );

    const businessId = bcRes.rows[0].id;

    /* ---------- business addresses ---------- */
    const addresses = Array.isArray(payload.addresses) ? payload.addresses : [];

    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      const isPrimary = i === 0;

      for (const a of payload.addresses || []) {
        await conn.query(
          `
    INSERT INTO business_addresses
      (
        business_id,
        country,
        province,
        address_line1,
        address_line2,
        city,
        postal_code,
        is_primary,
        is_mailing,
        created_at
      )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
          [
            businessId,
            a.country || null,
            a.province || null,
            a.line1 || null,
            a.line2 || null,
            a.city || null,
            a.postalCode || null,
            a.is_primary === true,
            a.is_mailing === true,
            now,
          ]
        );
      }
    }

    /* ---------- shareholders ---------- */
    for (const sh of payload.shareholders || []) {
      await conn.query(
        `
        INSERT INTO business_shareholders
          (business_id, full_name, dob, share_percentage, sin_encrypted, sin_hash, client_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          businessId,
          sh.fullName,
          sh.dob,
          Number(sh.sharePercentage),
          sh.sin ? encrypt(sh.sin) : null,
          sh.sin ? sha256(sh.sin) : null,
          sh.clientId || null,
        ]
      );
    }

    /* ---------- tax profiles ---------- */
    const profiles = [];

    if (payload.hstFrequency || payload.hstStartingDate) {
      frequency = payload.hstFrequency?.toLowerCase();

      profiles.push({
        key: "hst",
        frequency: frequency || null,
        start_date: payload.hstStartingDate || null,
      });
    }

    if (payload.corpoStartingYear) {
      profiles.push({
        key: "corporate",
        start_year: payload.corpoStartingYear,
      });
    }

    if (payload.payrollStartingYear) {
      profiles.push({
        key: "payroll",
        start_year: payload.payrollStartingYear,
      });
    }

    if (payload.wsibStartingYear || payload.wsibStartingQuarter) {
      profiles.push({
        key: "wsib",
        start_year: payload.wsibStartingYear || null,
        start_quarter: normalizeQuarter(payload.wsibStartingQuarter),
      });
    }

    if (payload.annualRenewalDate) {
      profiles.push({
        key: "annualRenewal",
        start_date: payload.annualRenewalDate,
      });
    }

    for (const p of profiles) {
      const dbTaxType = TAX_TYPE_MAP[p.key];
      if (!dbTaxType) throw new Error(`invalid_tax_type: ${p.key}`);

      await conn.query(
        `
        INSERT INTO business_tax_profiles
          (business_id, tax_type, frequency, start_date, start_year, start_quarter, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          businessId,
          dbTaxType,
          p.frequency || null,
          p.start_date || null,
          p.start_year || null,
          p.start_quarter || null,
          now,
          now,
        ]
      );
    }

    await conn.query("COMMIT");
    res.status(201).json({ id: businessId });
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("createBusiness:", err);
    res.status(500).json({ error: "server_error" });
  } finally {
    conn.release();
  }
}

async function getBusiness(req, res) {
  const businessId = req.params.id;
  if (!businessId) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    /* ================= BUSINESS ================= */
    const businessRes = await pool.query(
      `
      SELECT *
      FROM business_clients
      WHERE id = $1
      LIMIT 1
      `,
      [businessId]
    );

    if (!businessRes.rows.length) {
      return res.status(404).json({ error: "not_found" });
    }

    const business = businessRes.rows[0];

    /* ================= ADDRESSES ================= */
    const addrRes = await pool.query(
      `
      SELECT
        id,
        country,
        province,
        address_line1,
        address_line2,
        city,
        postal_code,
        is_primary,
        is_mailing,
        created_at
      FROM business_addresses
      WHERE business_id = $1
      ORDER BY
        is_primary DESC,
        is_mailing DESC,
        created_at ASC
      `,
      [businessId]
    );

    /* ================= SHAREHOLDERS (FIXED) ================= */
    const shareholdersRes = await pool.query(
      `
      SELECT
        bs.id,
        bs.full_name,
        bs.dob,
        bs.share_percentage,
        bs.client_id,

        c.first_name AS client_first_name,
        c.last_name  AS client_last_name,
        c.dob        AS client_dob
      FROM business_shareholders bs
      LEFT JOIN clients c ON c.id = bs.client_id
      WHERE bs.business_id = $1
      ORDER BY
        COALESCE(bs.full_name, c.first_name || ' ' || c.last_name) ASC
      `,
      [businessId]
    );

    /* ================= TAX PROFILES ================= */
    const taxProfilesRes = await pool.query(
      `
      SELECT *
      FROM business_tax_profiles
      WHERE business_id = $1
      ORDER BY
        CASE tax_type
          WHEN 'HST' THEN 1
          WHEN 'CORPORATION' THEN 2
          WHEN 'PAYROLL' THEN 3
          WHEN 'WSIB' THEN 4
          WHEN 'ANNUAL_RENEWAL' THEN 5
          ELSE 99
        END
      `,
      [businessId]
    );

    /* ================= TAX RECORDS ================= */
    const taxRecordsRes = await pool.query(
      `
      SELECT
        tr.*,
        au.full_name AS created_by_name
      FROM business_tax_records tr
      LEFT JOIN app_users au ON tr.created_by = au.id
      WHERE tr.business_id = $1
      ORDER BY tr.tax_year DESC, tr.created_at DESC
      `,
      [businessId]
    );

    /* ================= TAX DOCUMENTS ================= */
    const taxDocsRes = await pool.query(
      `
      SELECT
        td.id,
        td.tax_record_id,
        td.filename,
        td.object_store_key,
        td.uploaded_at,
        td.notes,
        au.full_name AS uploaded_by
      FROM hst_docs td
      LEFT JOIN app_users au ON td.uploaded_by = au.id
      WHERE td.tax_record_id IN (
        SELECT id
        FROM business_tax_records
        WHERE business_id = $1
      )
      ORDER BY td.uploaded_at DESC
      `,
      [businessId]
    );

    /* ================= HYDRATION ================= */

    const docsByRecord = {};
    for (const doc of taxDocsRes.rows) {
      if (!docsByRecord[doc.tax_record_id]) {
        docsByRecord[doc.tax_record_id] = [];
      }
      docsByRecord[doc.tax_record_id].push(doc);
    }

    const taxRecords = taxRecordsRes.rows.map((tr) => ({
      ...tr,
      documents: docsByRecord[tr.id] || [],
    }));

    const recordsByType = {};
    for (const tr of taxRecords) {
      if (!recordsByType[tr.tax_type]) {
        recordsByType[tr.tax_type] = [];
      }
      recordsByType[tr.tax_type].push(tr);
    }

    const taxProfiles = taxProfilesRes.rows.map((tp) => ({
      ...tp,
      records: recordsByType[tp.tax_type] || [],
    }));

    /* ================= RESPONSE ================= */
    return res.json({
      business,
      addresses: addrRes.rows,
      shareholders: shareholdersRes.rows,
      tax_profiles: taxProfiles,
    });
  } catch (err) {
    console.error("getBusiness:", err);
    return res.status(500).json({ error: "server_error" });
  }
}

async function patchBusiness(req, res) {
  const id = req.params.id;
  const payload = req.body || {};
  if (!req.user?.id) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");

    /* ================= BUSINESS ================= */

    const businessMap = {
      businessName: "business_name",
      businessNumber: "business_number",
      businessType: "business_type",
      email: "email",
      phoneCell: "phone_cell",
      phoneHome: "phone_home",
      phoneWork: "phone_work",
      fax: "fax",
      loyaltySince: "loyalty_since",
      referredBy: "referred_by",
    };

    const sets = [];
    const vals = [];

    for (const [k, col] of Object.entries(businessMap)) {
      if (payload[k] !== undefined) {
        sets.push(`${col} = $${vals.length + 1}`);
        vals.push(payload[k] ?? null);
      }
    }

    if (sets.length) {
      sets.push(`updated_at = now()`);
      vals.push(id);

      await conn.query(
        `UPDATE business_clients SET ${sets.join(", ")} WHERE id = $${
          vals.length
        }`,
        vals
      );
    }

    /* ================= PRIMARY ADDRESS ================= */

    if (payload.primaryAddress) {
      const cols = [];
      const vals = [];

      for (const [k, v] of Object.entries(payload.primaryAddress)) {
        cols.push(`${k} = $${vals.length + 1}`);
        vals.push(v ?? null);
      }

      if (cols.length) {
        vals.push(id);
        await conn.query(
          `
          UPDATE business_addresses
          SET ${cols.join(", ")}
          WHERE business_id = $${vals.length}
            AND is_primary = true
          `,
          vals
        );
      }
    }

    /* ================= MAILING ADDRESS ================= */

    if (payload.mailingAddress) {
      const existing = await conn.query(
        `
        SELECT id
        FROM business_addresses
        WHERE business_id = $1 AND is_mailing = true
        `,
        [id]
      );

      if (existing.rows.length) {
        const cols = [];
        const vals = [];

        for (const [k, v] of Object.entries(payload.mailingAddress)) {
          cols.push(`${k} = $${vals.length + 1}`);
          vals.push(v ?? null);
        }

        vals.push(id);

        await conn.query(
          `
          UPDATE business_addresses
          SET ${cols.join(", ")}
          WHERE business_id = $${vals.length}
            AND is_mailing = true
          `,
          vals
        );
      } else {
        await conn.query(
          `
          INSERT INTO business_addresses
            (business_id, is_primary, is_mailing,
             address_line1, address_line2, city, province, postal_code, country)
          VALUES ($1, false, true, $2, $3, $4, $5, $6, $7)
          `,
          [
            id,
            payload.mailingAddress.address_line1 ?? null,
            payload.mailingAddress.address_line2 ?? null,
            payload.mailingAddress.city ?? null,
            payload.mailingAddress.province ?? null,
            payload.mailingAddress.postal_code ?? null,
            payload.mailingAddress.country ?? null,
          ]
        );
      }
    }

    /* ================= TAX PROFILES ================= */

    if (Array.isArray(payload.taxProfiles)) {
      for (const tp of payload.taxProfiles) {
        const cols = [];
        const vals = [];

        if (tp.frequency !== undefined) {
          cols.push(`frequency = $${vals.length + 1}`);
          vals.push(tp.frequency ?? null);
        }
        if (tp.start_date !== undefined) {
          cols.push(`start_date = $${vals.length + 1}`);
          vals.push(tp.start_date ?? null);
        }
        if (tp.start_year !== undefined) {
          cols.push(`start_year = $${vals.length + 1}`);
          vals.push(tp.start_year ?? null);
        }
        if (tp.start_quarter !== undefined) {
          cols.push(`start_quarter = $${vals.length + 1}`);
          vals.push(tp.start_quarter ?? null);
        }

        if (cols.length) {
          vals.push(tp.id);
          await conn.query(
            `
            UPDATE business_tax_profiles
            SET ${cols.join(", ")}, updated_at = now()
            WHERE id = $${vals.length}
            `,
            vals
          );
        }
      }
    }

    await conn.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("patchBusiness:", err);
    res.status(500).json({ error: "server_error" });
  } finally {
    conn.release();
  }
}

async function deleteBusiness(req, res) {
  const id = req.params.id;
  if (!req.user?.id) return res.status(401).json({ error: "unauthenticated" });

  try {
    const r = await pool.query(
      `DELETE FROM business_clients WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!r.rowCount) return res.status(404).json({ error: "not_found" });

    res.json({ success: true });
  } catch (err) {
    console.error("deleteBusiness:", err);
    res.status(500).json({ error: "server_error" });
  }
}

//Tax Record Controllers

async function createTaxRecord(req, res) {
  const businessId = req.params.businessId;
  const {
    tax_type,
    tax_year,
    tax_date,
    tax_period,
    amount,
    confirmation_number,
    status,
    created_by,
  } = req.body;

  if (!businessId || !tax_type || !tax_year) {
    return res.status(400).json({ error: "missing_required_fields" });
  }

  const year = Number(tax_year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return res.status(400).json({ error: "invalid_tax_year" });
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    /* ---------- verify business ---------- */
    const b = await conn.query(
      `SELECT id FROM business_clients WHERE id = $1`,
      [businessId]
    );
    if (!b.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "business_not_found" });
    }

    /* ---------- prevent duplicates ---------- */
    const dup = await conn.query(
      `
      SELECT id
      FROM business_tax_records
      WHERE business_id = $1
        AND tax_type = $2
        AND tax_year = $3
        AND ($4::text IS NULL OR tax_period = $4::text)
      `,
      [businessId, tax_type, year, tax_period ?? null]
    );

    if (dup.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(409).json({ error: "duplicate_tax_record" });
    }

    /* ---------- insert ---------- */
    const { rows } = await conn.query(
      `
      INSERT INTO business_tax_records
      (
        business_id,
        tax_type,
        tax_year,
        tax_date,
        tax_period,
        amount,
        confirmation_number,
        status,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        businessId,
        tax_type,
        year,
        tax_date ?? null,
        tax_period ?? null,
        amount ?? null,
        confirmation_number ?? null,
        status ?? "pending",
        created_by ?? req.user.id, // MUST be a UUID
      ]
    );

    await conn.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("createBusinessTaxRecord:", err);
    res.status(500).json({ error: "server_error" });
  } finally {
    conn.release();
  }
}

async function patchTaxRecord(req, res) {
  const { businessId, taxRecordId } = req.params;
  const payload = req.body || {};
  const updatedBy = req.user?.id;

  if (!updatedBy) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    const check = await conn.query(
      `
      SELECT id
      FROM business_tax_records
      WHERE id = $1 AND business_id = $2
      FOR UPDATE
      `,
      [taxRecordId, businessId]
    );

    if (!check.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "tax_record_not_found" });
    }

    const sets = [];
    const vals = [];

    function add(col, val) {
      sets.push(`${col} = $${vals.length + 1}`);
      vals.push(val);
    }

    if (payload.tax_year !== undefined) add("tax_year", payload.tax_year);
    if (payload.tax_period !== undefined) add("tax_period", payload.tax_period);
    if (payload.amount !== undefined) add("amount", payload.amount);
    if (payload.tax_date !== undefined) add("tax_date", payload.tax_date);
    if (payload.status !== undefined) add("status", payload.status);
    if (payload.confirmation_number !== undefined)
      add("confirmation_number", payload.confirmation_number);

    if (!sets.length) {
      await conn.query("ROLLBACK");
      return res.status(400).json({ error: "no_changes" });
    }

    add("updated_at", new Date());

    const sql = `
      UPDATE business_tax_records
      SET ${sets.join(", ")}
      WHERE id = $${vals.length + 1}
    `;

    await conn.query(sql, [...vals, taxRecordId]);

    await conn.query("COMMIT");

    const { rows } = await pool.query(
      `SELECT * FROM business_tax_records WHERE id = $1`,
      [taxRecordId]
    );

    res.json({ success: true, tax_record: rows[0] });
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("patchBusinessTaxRecord:", err);
    res.status(500).json({ error: "server_error" });
  } finally {
    conn.release();
  }
}
async function deleteTaxRecord(req, res) {
  const { businessId, taxRecordId } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM business_tax_records
      WHERE id = $1 AND business_id = $2
      RETURNING id
      `,
      [taxRecordId, businessId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "tax_record_not_found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("deleteBusinessTaxRecord:", err);
    res.status(500).json({ error: "server_error" });
  }
}

//Shareholders Controllers

async function createBusinessShareholder(req, res) {
  const { businessId } = req.params;
  const payload = req.body || {};
  const createdBy = req.user?.id;

  if (!createdBy) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const { client_id, personal_client, full_name, dob, share_percentage } =
    payload;

  if (!share_percentage || Number(share_percentage) <= 0) {
    return res.status(400).json({ error: "invalid_share_percentage" });
  }

  // XOR validation
  const hasClientId = !!client_id;
  const hasPersonalClient = !!personal_client;
  const hasStandalone = !!full_name;

  if (
    [hasClientId, hasPersonalClient, hasStandalone].filter(Boolean).length !== 1
  ) {
    return res.status(400).json({
      error: "provide_exactly_one_of_client_id_personal_client_or_full_name",
    });
  }

  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");

    let resolvedClientId = null;

    /* ================= CASE 1: Existing client ================= */
    if (hasClientId) {
      const check = await conn.query(`SELECT id FROM clients WHERE id = $1`, [
        client_id,
      ]);

      if (!check.rows.length) {
        throw new Error("client_not_found");
      }

      resolvedClientId = client_id;
    }

    /* ================= CASE 2: New personal client ================= */
    if (hasPersonalClient) {
      const pc = personal_client;

      if (!pc.first_name || !pc.last_name) {
        throw new Error("missing_personal_client_name");
      }

      const insertClient = await conn.query(
        `
        INSERT INTO clients (
          first_name,
          last_name,
          dob,
          email,
          phone,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          pc.first_name,
          pc.last_name,
          pc.dob || null,
          pc.email || null,
          pc.phone || null,
          createdBy,
        ]
      );

      resolvedClientId = insertClient.rows[0].id;
    }

    /* ================= CASE 3: Standalone shareholder ================= */
    if (hasStandalone) {
      if (!full_name) {
        throw new Error("full_name_required");
      }
    }

    /* ================= INSERT SHAREHOLDER ================= */

    await conn.query(
      `
      INSERT INTO business_shareholders (
        business_id,
        client_id,
        full_name,
        dob,
        share_percentage,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `,
      [
        businessId,
        resolvedClientId,
        hasStandalone ? full_name : null,
        hasStandalone ? dob || null : null,
        share_percentage,
      ]
    );

    await conn.query("COMMIT");

    res.json({ success: true });
  } catch (err) {
    await conn.query("ROLLBACK");

    const msg = err.message || "server_error";
    console.error("createBusinessShareholder:", msg);

    res.status(400).json({ error: msg });
  } finally {
    conn.release();
  }
}

async function deleteBusinessShareholder(req, res) {
  const { businessId, shareholderId } = req.params;
  const deletedBy = req.user?.id || null;

  if (!businessId || !shareholderId) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // lock row to avoid race deletes
    const checkRes = await client.query(
      `
      SELECT id
      FROM business_shareholders
      WHERE id = $1 AND business_id = $2
      FOR UPDATE
      `,
      [shareholderId, businessId]
    );

    if (!checkRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "shareholder_not_found" });
    }

    await client.query(
      `
      DELETE FROM business_shareholders
      WHERE id = $1 AND business_id = $2
      `,
      [shareholderId, businessId]
    );

    await client.query("COMMIT");

    return res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteBusinessShareholder:", err);
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
}

module.exports = {
  listClients,
  createBusiness,
  getBusiness,
  patchBusiness,
  deleteBusiness,
  createTaxRecord,
  patchTaxRecord,
  deleteTaxRecord,
  createBusinessShareholder,
  deleteBusinessShareholder,
};
