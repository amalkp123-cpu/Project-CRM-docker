// controllers/pClient.Controller.js
const { pool } = require("../database/db");
const { encrypt, decrypt, sha256 } = require("../utils/crypto-utils");

const CLIENT_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "dob",
  "gender",
  "phone",
  "email",
  "fax",
  "sin_hash",
  "marital_status",
  "date_of_marriage",
  "loyalty_since",
  "referred_by",
  "created_by",
  "created_at",
  "updated_at",
  // virtual / joined fields
  "latest_tax_year",
  "latest_tax_date",
  "spouse_name", // ADD THIS
  "spouse_id", // ADD THIS
];

const DEFAULT_LIST_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "tax_status",
  "phone",
  "email",
  "latest_tax_year",
  "latest_tax_date",
  "spouse_name", // ADD THIS (optional, if you want it by default)
];

function sanitizeFields(q) {
  if (!q) return DEFAULT_LIST_FIELDS;
  const parts = String(q)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cols = parts.filter((p) => CLIENT_FIELDS.includes(p));
  return cols.length ? cols : DEFAULT_LIST_FIELDS;
}

function parseSort(sortQ) {
  const defCol = "created_at";
  if (!sortQ) return { col: defCol, dir: "DESC" };
  const [col, dirRaw] = String(sortQ)
    .split(":")
    .map((s) => s.trim());
  const dir = (dirRaw || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
  return { col: CLIENT_FIELDS.includes(col) ? col : defCol, dir };
}

function nullify(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

async function listClients(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "200", 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const fields = sanitizeFields(req.query.fields);
    const sort = parseSort(req.query.sort);

    // build select list mapping virtual fields to expressions
    const selectCols = fields
      .map((f) => {
        if (f === "latest_tax_year") return "tr.tax_year AS latest_tax_year";
        if (f === "latest_tax_date") return "tr.tax_date AS latest_tax_date";
        if (f === "tax_status") return "tr.tax_status AS tax_status";
        if (f === "spouse_name")
          return "CONCAT(spouse.first_name, ' ', spouse.last_name) AS spouse_name";
        if (f === "spouse_id") return "sl.linked_client_id AS spouse_id";
        // otherwise select from clients table alias c
        return `c.${f}`;
      })
      .join(", ");

    const whereClauses = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      whereClauses.push(
        `(c.first_name ILIKE $${params.length - 1} OR c.last_name ILIKE $${
          params.length
        })`
      );
    }

    // tenant scoping: if req.user.tenant_id exists, enforce it
    if (req.user && req.user.tenant_id) {
      params.push(req.user.tenant_id);
      whereClauses.push(`c.tenant_id = $${params.length}`);
    }

    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    // main query: left join lateral latest tax record + spouse info
    const listSql = `
      SELECT ${selectCols}
      FROM clients c
      LEFT JOIN LATERAL (
        SELECT tax_year, tax_date, tax_status
        FROM tax_records t
        WHERE t.client_id = c.id
        ORDER BY tax_year DESC
        LIMIT 1
      ) tr ON true
      LEFT JOIN spouse_links sl ON (sl.client_id = c.id)
      LEFT JOIN clients spouse ON (sl.linked_client_id = spouse.id)
      ${whereSql}
      ORDER BY c.${sort.col} ${sort.dir}, c.id ${sort.dir}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, limit, offset];
    const listRes = await pool.query(listSql, listParams);

    // count
    const countSql = `SELECT COUNT(1) AS total FROM clients c ${whereSql}`;
    const countRes = await pool.query(countSql, params);
    const total = Number(countRes.rows[0]?.total || 0);

    return res.json({
      data: listRes.rows,
      meta: { total, page, per_page: limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listClients error:", err);
    return res
      .status(500)
      .json({ error: "server_error", details: err.message });
  }
}

async function getClient(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "invalid_id" });

    // ---------- helper ----------
    async function hydrateClient(clientId) {
      const clientSql = `
        SELECT 
          c.*,
          u.username AS created_by_username,
          u.full_name AS created_by_full_name,
          u.role AS created_by_role
        FROM clients c
        LEFT JOIN app_users u ON c.created_by = u.id
        WHERE c.id = $1
        LIMIT 1
      `;
      const { rows } = await pool.query(clientSql, [clientId]);
      if (!rows.length) return null;

      const client = rows[0];

      if (client.sin_encrypted) {
        try {
          client.sin_original = decrypt(client.sin_encrypted);
        } catch {
          client.sin_original = null;
        }
      }

      // addresses
      const addrRes = await pool.query(
        `SELECT id, country, province, address_line1, address_line2, city, postal_code, is_primary, created_at
         FROM addresses
         WHERE client_id = $1
         ORDER BY is_primary DESC, created_at ASC`,
        [clientId]
      );
      client.addresses = addrRes.rows;

      const notesRes = await pool.query(
        `SELECT 
    nt.id AS id, 
    nt.created_at AS created_at, 
    nt.note_text AS note_text,
    au.full_name AS created_by
FROM notes nt
LEFT JOIN app_users au ON nt.created_by = au.id
WHERE nt.client_id = $1
ORDER BY nt.created_at DESC`,
        [clientId]
      );
      client.notes = notesRes.rows;

      // dependants
      const depRes = await pool.query(
        `SELECT id, first_name, last_name, dob, gender, relationship, disability, disability_notes, same_address, address_id
         FROM dependants
         WHERE client_id = $1
         ORDER BY id ASC`,
        [clientId]
      );
      client.dependants = depRes.rows;

      // tax records
      const taxRes = await pool.query(
        `SELECT 
    tr.id AS id, 
    tr.tax_year AS tax_year, 
    tr.tax_status AS tax_status, 
    tr.tax_date AS tax_date, 
    tr.hst_required AS hst_required, 
    tr.last_updated AS last_updated, 
    tr.created_by AS created_by_id, 
    tr.prepared_by AS prepared_by,
    au.full_name AS created_by
FROM tax_records tr
LEFT JOIN app_users au ON tr.created_by = au.id
WHERE tr.client_id = $1
ORDER BY tr.tax_year DESC`,
        [clientId]
      );

      const hstRes = await pool.query(
        `
  SELECT
    hst_docs.id,
    tax_record_id,
    filename,
    uploaded_at,
    uploaded_by as uploaded_by_id,
    au.full_name AS uploaded_by_name
  FROM hst_docs
  LEFT JOIN app_users au ON hst_docs.uploaded_by = au.id
  WHERE client_id = $1
  ORDER BY uploaded_at DESC
  `,
        [clientId]
      );

      const hstByTaxRecord = {};

      for (const doc of hstRes.rows) {
        if (!hstByTaxRecord[doc.tax_record_id]) {
          hstByTaxRecord[doc.tax_record_id] = [];
        }
        hstByTaxRecord[doc.tax_record_id].push(doc);
      }

      client.tax_records = taxRes.rows;
      client.tax_records = client.tax_records.map((tr) => ({
        ...tr,
        hst_docs: hstByTaxRecord[tr.id] || [],
      }));

      // verifications
      const verRes = await pool.query(
        `SELECT id, entity_type, action, verifier_id, notes, created_at
         FROM verifications
         WHERE entity_id = $1 AND entity_type = 'client'
         ORDER BY created_at DESC`,
        [clientId]
      );
      client.verifications = verRes.rows;

      return client;
    }

    // ---------- main client ----------
    const client = await hydrateClient(id);
    if (!client) return res.status(404).json({ error: "not_found" });

    // ---------- spouse lookup ----------
    const spouseLinkRes = await pool.query(
      `
      SELECT linked_client_id, date_of_marriage
      FROM spouse_links
      WHERE client_id = $1
      LIMIT 1
      `,
      [id]
    );

    let spouse = null;

    if (spouseLinkRes.rows.length) {
      const spouseId = spouseLinkRes.rows[0].linked_client_id;
      spouse = await hydrateClient(spouseId);

      if (spouse) {
        spouse.date_of_marriage = spouseLinkRes.rows[0].date_of_marriage;
        client.date_of_marriage = spouseLinkRes.rows[0].date_of_marriage;
      }
    }

    return res.json({
      client,
      spouse,
    });
  } catch (err) {
    console.error("getClient error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  }
}

async function createBulk(req, res) {
  const payload = req.body || {};
  const clientsInput = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.clients)
    ? payload.clients
    : null;

  const createdById = req.user?.id || null;
  if (!createdById) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  if (!clientsInput || clientsInput.length === 0) {
    return res.status(400).json({ error: "no_clients_provided" });
  }

  const results = [];
  let created = 0;
  let failed = 0;

  // Helper to normalize common keys (accept camelCase or snake_case)
  function pick(v, ...keys) {
    for (const k of keys) {
      if (v[k] !== undefined) return v[k];
    }
    return undefined;
  }

  // Insert a single client within its own transaction; returns { success, id?, error? }
  async function insertOne(clientPayload) {
    const clientConn = await pool.connect();
    try {
      await clientConn.query("BEGIN");
      const now = new Date();

      // Basic required fields: allow camelCase or snake_case
      const firstName = pick(clientPayload, "firstName", "first_name");
      const lastName = pick(clientPayload, "lastName", "last_name");
      if (!firstName || !lastName) {
        await clientConn.query("ROLLBACK");
        return { success: false, error: "first_name_and_last_name_required" };
      }

      // SIN handling
      const sinRaw = nullify(
        pick(clientPayload, "sin", "sin_raw", "sin_encrypted")
      );
      const sinHash = sinRaw ? sha256(sinRaw) : null;

      const insertClientSql = `
        INSERT INTO clients
          (first_name, last_name, dob, gender, phone, email, fax, sin_encrypted, sin_hash,
           marital_status, loyalty_since, referred_by,
           created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING id
      `;

      const insertClientVals = [
        firstName,
        lastName,
        nullify(pick(clientPayload, "dob")),
        nullify(pick(clientPayload, "gender")),
        nullify(pick(clientPayload, "phone")),
        nullify(pick(clientPayload, "email")),
        nullify(pick(clientPayload, "fax")),
        sinRaw ? encrypt(sinRaw) : null,
        sinHash,
        nullify(pick(clientPayload, "maritalStatus", "marital_status")),
        nullify(
          pick(clientPayload, "loyalty", "loyalty_since", "loyaltySince")
        ),
        nullify(pick(clientPayload, "referredBy", "referred_by")),
        createdById,
        now,
        now,
      ];

      const clientInsertRes = await clientConn.query(
        insertClientSql,
        insertClientVals
      );
      const clientId = clientInsertRes.rows[0].id;

      // Addresses
      const addresses = Array.isArray(clientPayload.addresses)
        ? clientPayload.addresses
        : [];
      const insertedAddressIds = [];
      for (let i = 0; i < addresses.length; i++) {
        const addr = addresses[i] || {};
        const isPrimary = i === 0;
        const addressSql = `
          INSERT INTO addresses
            (client_id, country, province, address_line1, address_line2, city, postal_code, is_primary, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id
        `;
        const addressVals = [
          clientId,
          addr.countryCode || addr.country || null,
          addr.province || null,
          addr.line1 || addr.addressLine1 || null,
          addr.line2 || addr.addressLine2 || null,
          addr.city || null,
          addr.postalCode || addr.postal_code || null,
          isPrimary,
          now,
        ];
        const r = await clientConn.query(addressSql, addressVals);
        insertedAddressIds.push(r.rows[0].id);
      }
      const firstAddressId = insertedAddressIds.length
        ? insertedAddressIds[0]
        : null;

      // Dependants
      const dependants = Array.isArray(clientPayload.dependents)
        ? clientPayload.dependents
        : [];
      const dependantIdMap = {};
      for (const dep of dependants) {
        let depAddressId = null;
        const sameAddress = pick(dep, "sameAddress", "same_address");
        if (sameAddress) {
          depAddressId = firstAddressId;
        } else if (
          dep.addressLine1 ||
          dep.address_line1 ||
          dep.line1 ||
          dep.addressLine2 ||
          dep.city
        ) {
          const depAddrSql = `
            INSERT INTO addresses
              (client_id, country, province, address_line1, address_line2, city, postal_code, is_primary, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING id
          `;
          const depCountry = pick(dep, "country") || null;
          const depVals = [
            clientId,
            depCountry,
            pick(dep, "province") || null,
            dep.addressLine1 || dep.line1 || dep.address_line1 || null,
            dep.addressLine2 || dep.line2 || dep.address_line2 || null,
            dep.city || null,
            pick(dep, "postalCode", "postal_code") || null,
            false,
            now,
          ];
          const depAddrRes = await clientConn.query(depAddrSql, depVals);
          depAddressId = depAddrRes.rows[0].id;
        }

        const depSql = `
          INSERT INTO dependants
            (client_id, first_name, last_name, dob, gender, relationship, disability, disability_notes, same_address, address_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING id
        `;
        const depVals = [
          clientId,
          pick(dep, "firstName", "first_name") || null,
          pick(dep, "lastName", "last_name") || null,
          pick(dep, "dob") || null,
          pick(dep, "gender") || null,
          pick(dep, "relationship") || null,
          pick(dep, "disability") ? true : false,
          pick(dep, "disabilityNotes", "disability_notes") || null,
          sameAddress ? true : false,
          depAddressId,
        ];
        const insertedDep = await clientConn.query(depSql, depVals);
        const realDepId = insertedDep.rows[0].id;
        if (dep.tempId) dependantIdMap[dep.tempId] = realDepId;
      }

      // Tax details (client)
      const taxDetails = Array.isArray(clientPayload.taxDetails)
        ? clientPayload.taxDetails
        : [];
      for (const t of taxDetails) {
        const taxSql = `
          INSERT INTO tax_records
            (client_id, tax_year, tax_status, tax_date, hst_required, last_updated)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (client_id, tax_year) DO UPDATE
            SET tax_status = EXCLUDED.tax_status,
                tax_date = EXCLUDED.tax_date,
                hst_required = EXCLUDED.hst_required,
                last_updated = EXCLUDED.last_updated
        `;
        const taxVals = [
          clientId,
          t.taxYear
            ? parseInt(t.taxYear, 10)
            : t.tax_year
            ? parseInt(t.tax_year, 10)
            : null,
          t.status || t.tax_status || null,
          t.filedOn || t.tax_date || t.statusDate || null,
          t.hstRequired !== undefined ? !!t.hstRequired : null,
          now,
        ];
        await clientConn.query(taxSql, taxVals);
      }

      // Spouse insertion and linking
      let spouseId = null;
      const spouseFirst = pick(
        clientPayload,
        "spouseFirstName",
        "spouse_first_name"
      );
      if (spouseFirst) {
        const spouseSin = nullify(
          pick(clientPayload, "spouseSin", "spouse_sin")
        );
        const spouseSinHash = spouseSin ? sha256(spouseSin) : null;
        const spouseSql = `
          INSERT INTO clients
            (first_name, last_name, dob, gender, phone, email, marital_status, sin_encrypted, sin_hash, created_by, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, $12)
          RETURNING id
        `;
        const spouseVals = [
          spouseFirst,
          pick(clientPayload, "spouseLastName", "spouse_last_name") || null,
          pick(clientPayload, "spouseDob", "spouse_dob") || null,
          pick(clientPayload, "spouseGender", "spouse_gender") || null,
          pick(clientPayload, "spousePhone", "spouse_phone") || null,
          pick(clientPayload, "spouseEmail", "spouse_email") || null,
          pick(clientPayload, "maritalStatus", "marital_status") || null,
          spouseSin ? encrypt(spouseSin) : null,
          spouseSinHash,
          createdById,
          now,
          now,
        ];
        const spouseRes = await clientConn.query(spouseSql, spouseVals);
        spouseId = spouseRes.rows[0].id;

        const linkSql = `INSERT INTO spouse_links (client_id, linked_client_id, date_of_marriage) VALUES ($1,$2,$3)`;
        const dateOfMarriage =
          pick(clientPayload, "dateOfMarriage", "date_of_marriage") || null;
        await clientConn.query(linkSql, [clientId, spouseId, dateOfMarriage]);
        await clientConn.query(linkSql, [spouseId, clientId, dateOfMarriage]);
      }

      // HST docs placeholder
      if (pick(clientPayload, "attachment")) {
        const hstSql = `
          INSERT INTO hst_docs (client_id, filename, object_store_key, uploaded_by, uploaded_at, checksum, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `;
        await clientConn.query(hstSql, [
          clientId,
          pick(clientPayload, "attachment") || null,
          pick(clientPayload, "attachment") || null,
          createdById,
          now,
          pick(clientPayload, "checksum") || null,
          pick(clientPayload, "notes") || null,
        ]);
      }

      // Spouse tax records
      const spouseTax = Array.isArray(clientPayload.spouseTaxDetails)
        ? clientPayload.spouseTaxDetails
        : Array.isArray(clientPayload.spouse_tax_details)
        ? clientPayload.spouse_tax_details
        : [];
      if (spouseTax.length && spouseId) {
        for (const t of spouseTax) {
          await clientConn.query(
            `INSERT INTO tax_records (client_id, tax_year, tax_status, tax_date, last_updated)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (client_id, tax_year) DO UPDATE
               SET tax_status = EXCLUDED.tax_status, tax_date = EXCLUDED.tax_date, last_updated = EXCLUDED.last_updated`,
            [
              spouseId,
              t.taxYear
                ? parseInt(t.taxYear, 10)
                : t.tax_year
                ? parseInt(t.tax_year, 10)
                : null,
              t.status || t.tax_status || null,
              t.statusDate || t.tax_date || null,
              now,
            ]
          );
        }
      }

      await clientConn.query("COMMIT");

      return {
        success: true,
        id: clientId,
        addressIds: insertedAddressIds,
        dependantIdMap,
        spouseId: spouseId || null,
      };
    } catch (err) {
      await clientConn.query("ROLLBACK").catch(() => {});
      // return error message for this item
      return { success: false, error: err.message || "insert_failed" };
    } finally {
      clientConn.release();
    }
  }

  // process sequentially to avoid DB contention and keep ordering consistent for error reporting
  for (let i = 0; i < clientsInput.length; i++) {
    const item = clientsInput[i];
    try {
      const r = await insertOne(item);
      if (r && r.success) {
        created++;
        results.push({ index: i, success: true, id: r.id });
      } else {
        failed++;
        results.push({ index: i, success: false, error: r.error || "unknown" });
      }
    } catch (err) {
      failed++;
      results.push({
        index: i,
        success: false,
        error: err.message || "unexpected_error",
      });
    }
  }

  return res.json({ created, failed, results });
}

async function createPersonal(req, res) {
  const payload = req.body || {};

  // require authentication middleware to attach req.user.id (UUID)
  const createdById = req.user?.id || null;
  if (!createdById) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  if (!payload.firstName || !payload.lastName) {
    return res.status(400).json({ error: "first_name_and_last_name_required" });
  }

  const clientConn = await pool.connect();
  try {
    await clientConn.query("BEGIN");
    const now = new Date();

    // 1) Insert main client
    const sin = nullify(payload.sin);
    const sinHash = sin ? sha256(sin) : null;

    const insertClientSql = `
      INSERT INTO clients
        (first_name, last_name, dob, gender, phone, email, fax, sin_encrypted, sin_hash,
         marital_status, loyalty_since, referred_by,
         created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id
    `;
    const insertClientVals = [
      payload.firstName,
      payload.lastName,
      payload.dob || null,
      payload.gender || null,
      payload.phone || null,
      payload.email || null,
      payload.fax || null,
      sin ? encrypt(sin) : null,
      sinHash,
      payload.maritalStatus || null,
      payload.loyalty || null,
      payload.referredBy || null,
      createdById, // must be UUID
      now,
      now,
    ];

    const clientInsertRes = await clientConn.query(
      insertClientSql,
      insertClientVals
    );
    const clientId = clientInsertRes.rows[0].id;

    // 2) Insert addresses and collect inserted ids
    const addresses = Array.isArray(payload.addresses) ? payload.addresses : [];
    const insertedAddressIds = [];

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      const isPrimary = i === 0; // Option A: first address = primary

      const addressSql = `
        INSERT INTO addresses
          (client_id, country, province, address_line1, address_line2, city, postal_code, is_primary, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id
      `;

      const addressVals = [
        clientId,
        addr.countryCode || addr.country || null,
        addr.province || null,
        addr.line1 || addr.addressLine1 || null,
        addr.line2 || addr.addressLine2 || null,
        addr.city || null,
        addr.postalCode || null,
        isPrimary,
        now,
      ];

      const r = await clientConn.query(addressSql, addressVals);
      insertedAddressIds.push(r.rows[0].id);
    }

    const firstAddressId = insertedAddressIds.length
      ? insertedAddressIds[0]
      : null;

    // 2) Insert addresses and collect inserted ids
    const notes = Array.isArray(payload.notes) ? payload.notes : [];

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      const notesSql = `
        INSERT INTO notes
          (client_id, note_text, created_by)
        VALUES ($1,$2,$3)
        RETURNING id
      `;

      const notesVals = [clientId, note, createdById];

      const r = await clientConn.query(notesSql, notesVals);
    }

    // 3) Insert dependants. Return mapping tempId -> real id for frontend reconciliation.
    const dependants = Array.isArray(payload.dependents)
      ? payload.dependents
      : [];
    const dependantIdMap = {}; // tempId => real UUID

    for (const dep of dependants) {
      let depAddressId = null;

      if (dep.sameAddress) {
        depAddressId = firstAddressId;
      } else if (dep.addressLine1 || dep.addressLine2 || dep.city) {
        const depAddrSql = `
          INSERT INTO addresses
            (client_id, country, province, address_line1, address_line2, city, postal_code, is_primary, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING id
        `;
        const depCountry = dep.country || null;
        const depVals = [
          clientId,
          depCountry,
          dep.province || null,
          dep.addressLine1 || dep.line1 || null,
          dep.addressLine2 || dep.line2 || null,
          dep.city || null,
          dep.postalCode || null,
          false,
          now,
        ];
        const depAddrRes = await clientConn.query(depAddrSql, depVals);
        depAddressId = depAddrRes.rows[0].id;
      }

      const depSql = `
        INSERT INTO dependants
          (client_id, first_name, last_name, dob, gender, relationship, disability, disability_notes, same_address, address_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id
      `;
      const depVals = [
        clientId,
        dep.firstName || dep.first_name || null,
        dep.lastName || dep.last_name || null,
        dep.dob || null,
        dep.gender || null,
        dep.relationship || null,
        dep.disability ? true : false,
        dep.disabilityNotes || dep.disability_notes || null,
        dep.sameAddress ? true : false,
        depAddressId,
      ];
      const insertedDep = await clientConn.query(depSql, depVals);
      const realDepId = insertedDep.rows[0].id;
      if (dep.tempId) dependantIdMap[dep.tempId] = realDepId;
    }

    // 4) Insert tax records for client
    const taxDetails = Array.isArray(payload.taxDetails)
      ? payload.taxDetails
      : [];
    for (const t of taxDetails) {
      const taxSql = `
        INSERT INTO tax_records
          (client_id, tax_year, tax_status, tax_date, hst_required, last_updated, created_by, prepared_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (client_id, tax_year) DO UPDATE
          SET tax_status = EXCLUDED.tax_status,
              tax_date = EXCLUDED.tax_date,
              hst_required = EXCLUDED.hst_required,
              last_updated = EXCLUDED.last_updated
      `;
      const taxVals = [
        clientId,
        t.taxYear ? parseInt(t.taxYear, 10) : null,
        t.status || t.tax_status || null,
        t.filedOn || t.tax_date || t.statusDate || null,
        t.hstRequired !== undefined ? !!t.hstRequired : null,
        now,
        createdById,
        t.preparedBy || null,
      ];
      await clientConn.query(taxSql, taxVals);
    }

    // 5) Spouse creation and linking (if provided)
    let spouseId = null;
    if (payload.spouseFirstName) {
      const spouseSin = nullify(payload.spouseSin);
      const spouseSinHash = spouseSin ? sha256(spouseSin) : null;

      const spouseSql = `
        INSERT INTO clients
          (first_name, last_name, dob, gender, phone, email, marital_status, sin_encrypted, sin_hash, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id
      `;
      const spouseVals = [
        payload.spouseFirstName,
        payload.spouseLastName || null,
        payload.spouseDob || null,
        payload.spouseGender || null,
        payload.spousePhone || null,
        payload.spouseEmail || null,
        payload.maritalStatus || null,
        spouseSin ? encrypt(spouseSin) : null,
        spouseSinHash,
        createdById,
        now,
        now,
      ];
      const spouseRes = await clientConn.query(spouseSql, spouseVals);
      spouseId = spouseRes.rows[0].id;

      const linkSql = `INSERT INTO spouse_links (client_id, linked_client_id, date_of_marriage) VALUES ($1,$2,$3)`;
      await clientConn.query(linkSql, [
        clientId,
        spouseId,
        payload.dateOfMarriage || null,
      ]);
      await clientConn.query(linkSql, [
        spouseId,
        clientId,
        payload.dateOfMarriage || null,
      ]);
    }

    // 6) HST docs placeholder
    if (payload.attachment) {
      const hstSql = `
        INSERT INTO hst_docs (client_id, filename, object_store_key, uploaded_by, uploaded_at, checksum, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `;
      await clientConn.query(hstSql, [
        clientId,
        payload.attachment || null,
        payload.attachment || null,
        createdById,
        now,
        payload.checksum || null,
        payload.notes || null,
      ]);
    }

    // 7) Spouse tax records
    const spouseTax = Array.isArray(payload.spouseTaxDetails)
      ? payload.spouseTaxDetails
      : [];
    if (spouseTax.length && spouseId) {
      for (const t of spouseTax) {
        await clientConn.query(
          `INSERT INTO tax_records (client_id, tax_year, tax_status, tax_date, last_updated)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (client_id, tax_year) DO UPDATE
             SET tax_status = EXCLUDED.tax_status, tax_date = EXCLUDED.tax_date, last_updated = EXCLUDED.last_updated`,
          [
            spouseId,
            t.taxYear ? parseInt(t.taxYear, 10) : null,
            t.status || t.tax_status || null,
            t.statusDate || t.tax_date || null,
            now,
          ]
        );
      }
    }

    await clientConn.query("COMMIT");

    return res.status(201).json({
      id: clientId,
      addressIds: insertedAddressIds,
      dependantIdMap,
      spouseId: spouseId || null,
    });
  } catch (err) {
    await clientConn.query("ROLLBACK").catch(() => {});
    console.error("createPersonal error:", err);
    return res
      .status(500)
      .json({ error: "server_error", details: err.message });
  } finally {
    clientConn.release();
  }
}

async function deleteClient(req, res) {
  const clientId = req.params.id;
  const actor = req.user?.id;
  if (!actor) return res.status(401).json({ error: "unauthenticated" });
  if (!clientId) return res.status(400).json({ error: "invalid_id" });

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Lock the client row to avoid concurrent edits
    const chk = await conn.query(
      `SELECT id, first_name, last_name FROM clients WHERE id = $1 FOR UPDATE`,
      [clientId]
    );
    if (!chk.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "client_not_found" });
    }

    // Collect all linked spouses
    const links = await conn.query(
      `SELECT linked_client_id FROM spouse_links WHERE client_id = $1`,
      [clientId]
    );
    const linkedIds = links.rows.map((r) => r.linked_client_id).filter(Boolean);

    if (linkedIds.length) {
      // Lock spouse rows
      await conn.query(`SELECT id FROM clients WHERE id = ANY($1) FOR UPDATE`, [
        linkedIds,
      ]);

      // For each linked spouse: clear marital info and remove reciprocal link
      // If you have marital_status column, set to 'single' else set to null
      await conn.query(
        `UPDATE clients
         SET marital_status = NULL, updated_at = now()
         WHERE id = ANY($1)`,
        [linkedIds]
      );

      // Remove reciprocal spouse_links rows (linked -> client)
      await conn.query(
        `DELETE FROM spouse_links WHERE client_id = ANY($1) AND linked_client_id = $2`,
        [linkedIds, clientId]
      );
    }

    // Remove this client's links (client -> linked)
    await conn.query(
      `DELETE FROM spouse_links WHERE client_id = $1 OR linked_client_id = $1`,
      [clientId]
    );

    // Delete client row. Replace with UPDATE ... SET deleted_at = now() if soft-delete desired.
    const del = await conn.query(`DELETE FROM clients WHERE id = $1`, [
      clientId,
    ]);
    if (del.rowCount === 0) {
      await conn.query("ROLLBACK");
      return res.status(409).json({ error: "client_not_deleted" });
    }

    await conn.query("COMMIT");
    return res.json({ success: true, id: clientId });
  } catch (err) {
    await conn.query("ROLLBACK").catch(() => {});
    console.error("deleteClient error:", err);
    return res
      .status(500)
      .json({ error: "server_error", details: err.message });
  } finally {
    conn.release();
  }
}

async function patchClient(req, res) {
  const businessId = req.params.id;
  const { business, addresses, taxProfiles } = req.body || {};

  if (!req.user?.id) {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");

    /* ============================================================
       1. PATCH business_clients
    ============================================================ */
    if (business && Object.keys(business).length) {
      const fieldMap = {
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

      for (const [key, col] of Object.entries(fieldMap)) {
        if (business[key] !== undefined) {
          sets.push(`${col} = $${vals.length + 1}`);
          vals.push(nullify(business[key]));
        }
      }

      if (sets.length) {
        sets.push(`updated_at = now()`);
        vals.push(businessId);

        await conn.query(
          `UPDATE business_clients
           SET ${sets.join(", ")}
           WHERE id = $${vals.length}`,
          vals
        );
      }
    }

    /* ============================================================
       2. PATCH business_addresses
    ============================================================ */
    if (addresses) {
      const addressFields = [
        "country",
        "province",
        "city",
        "address_line1",
        "address_line2",
        "postal_code",
      ];

      for (const [role, flag] of [
        ["primary", "is_primary"],
        ["mailing", "is_mailing"],
      ]) {
        const data = addresses[role];
        if (!data) continue;

        const sets = [];
        const vals = [];

        for (const field of addressFields) {
          if (data[field] !== undefined) {
            sets.push(`${field} = $${vals.length + 1}`);
            vals.push(nullify(data[field]));
          }
        }

        if (sets.length) {
          sets.push(`updated_at = now()`);
          vals.push(businessId);

          await conn.query(
            `UPDATE business_addresses
             SET ${sets.join(", ")}
             WHERE business_id = $${vals.length}
               AND ${flag} = true`,
            vals
          );
        }
      }
    }

    /* ============================================================
       3. PATCH business_tax_profiles
    ============================================================ */
    if (Array.isArray(taxProfiles)) {
      for (const tp of taxProfiles) {
        if (!tp.id) continue;

        const sets = [];
        const vals = [];

        if (tp.frequency !== undefined) {
          sets.push(`frequency = $${vals.length + 1}`);
          vals.push(nullify(tp.frequency));
        }

        if (tp.start_date !== undefined) {
          sets.push(`start_date = $${vals.length + 1}`);
          vals.push(nullify(tp.start_date));
        }

        if (tp.start_year !== undefined) {
          sets.push(`start_year = $${vals.length + 1}`);
          vals.push(nullify(tp.start_year));
        }

        if (tp.start_quarter !== undefined) {
          sets.push(`start_quarter = $${vals.length + 1}`);
          vals.push(nullify(tp.start_quarter));
        }

        if (sets.length) {
          sets.push(`updated_at = now()`);
          vals.push(tp.id, businessId);

          await conn.query(
            `UPDATE business_tax_profiles
             SET ${sets.join(", ")}
             WHERE id = $${vals.length - 1}
               AND business_id = $${vals.length}`,
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

async function insertAddress(req, res) {
  const clientId = req.params.id;
  const { line1, line2, city, province, postalCode, country, isPrimary } =
    req.body;

  if (!line1 || !city) {
    return res.status(400).json({
      error: "validation_error",
      message: "line1 and city are required",
    });
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Verify client exists
    const clientCheck = await conn.query(
      "SELECT id FROM clients WHERE id = $1",
      [clientId]
    );
    if (!clientCheck.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "client_not_found" });
    }

    // If this address is primary, unset other primary addresses
    if (isPrimary) {
      await conn.query(
        "UPDATE addresses SET is_primary = false WHERE client_id = $1",
        [clientId]
      );
    }

    // Insert new address
    const result = await conn.query(
      `INSERT INTO addresses 
       (client_id, address_line1, address_line2, city, province, postal_code, country, is_primary, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        clientId,
        line1,
        line2 || null,
        city,
        province || null,
        postalCode || null,
        country || null,
        isPrimary || false,
      ]
    );

    await conn.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("insertAddress error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

async function deleteAddress(req, res) {
  const clientId = req.params.id;
  const addressId = req.params.addressId;

  if (!addressId) {
    return res.status(400).json({ error: "address_id_required" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM addresses WHERE id = $1 AND client_id = $2 RETURNING id",
      [addressId, clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "address_not_found",
        message: "Address not found or does not belong to this client",
      });
    }

    return res.json({
      success: true,
      id: addressId,
      message: "Address deleted successfully",
    });
  } catch (err) {
    console.error("deleteAddress error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  }
}

async function insertNote(req, res) {
  const clientId = req.params.id;
  const note = req.body.note;
  const userId = req.user?.id;

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Verify client exists
    const clientCheck = await conn.query(
      "SELECT id FROM clients WHERE id = $1",
      [clientId]
    );
    if (!clientCheck.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "client_not_found" });
    }

    // Insert new address
    const result = await conn.query(
      `INSERT INTO notes 
       (client_id, note_text, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [clientId, note, userId]
    );

    await conn.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("insertNote error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

async function deleteNote(req, res) {
  const clientId = req.params.id;
  const NoteId = req.params.noteId;

  if (!NoteId) {
    return res.status(400).json({ error: "note_id_required" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM notes WHERE id = $1 AND client_id = $2 RETURNING id",
      [NoteId, clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "note_not_found",
        message: "note not found or does not belong to this client",
      });
    }

    return res.json({
      success: true,
      id: NoteId,
      message: "note deleted successfully",
    });
  } catch (err) {
    console.error("deleteNote error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  }
}

async function insertDependent(req, res) {
  const clientId = req.params.id;
  const {
    firstName,
    lastName,
    dob,
    gender,
    relationship,
    disability,
    disabilityNotes,
    sameAddress,
    addressId,
    // If dependent has their own address
    line1,
    line2,
    city,
    province,
    postalCode,
    country,
  } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({
      error: "validation_error",
      message: "firstName and lastName are required",
    });
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Verify client exists
    const clientCheck = await conn.query(
      "SELECT id FROM clients WHERE id = $1",
      [clientId]
    );
    if (!clientCheck.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "client_not_found" });
    }

    let depAddressId = null;

    // Handle dependent's address
    if (sameAddress) {
      // Use client's primary address
      const primaryAddr = await conn.query(
        "SELECT id FROM addresses WHERE client_id = $1 AND is_primary = true LIMIT 1",
        [clientId]
      );
      depAddressId = primaryAddr.rows[0]?.id || null;
    } else if (addressId) {
      // Use specified address ID
      depAddressId = addressId;
    } else if (line1 && city) {
      // Create new address for dependent
      const addrResult = await conn.query(
        `INSERT INTO addresses
         (client_id, address_line1, address_line2, city, province, postal_code, country, is_primary, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
         RETURNING id`,
        [
          clientId,
          line1,
          line2 || null,
          city,
          province || null,
          postalCode || null,
          country || null,
        ]
      );
      depAddressId = addrResult.rows[0].id;
    }

    // Insert dependent
    const result = await conn.query(
      `INSERT INTO dependants
       (client_id, first_name, last_name, dob, gender, relationship, disability, disability_notes, same_address, address_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        clientId,
        firstName,
        lastName,
        dob || null,
        gender || null,
        relationship || null,
        disability || false,
        disabilityNotes || null,
        sameAddress || false,
        depAddressId,
      ]
    );

    await conn.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("insertDependent error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

async function deleteDependent(req, res) {
  const clientId = req.params.id;
  const dependentId = req.params.dependentId;

  if (!dependentId) {
    return res.status(400).json({ error: "dependent_id_required" });
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Get dependent info to check for associated address
    const depCheck = await conn.query(
      "SELECT id, address_id, same_address FROM dependants WHERE id = $1 AND client_id = $2",
      [dependentId, clientId]
    );

    if (!depCheck.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({
        error: "dependent_not_found",
        message: "Dependent not found or does not belong to this client",
      });
    }

    const dependent = depCheck.rows[0];

    // Delete dependent
    await conn.query(
      "DELETE FROM dependants WHERE id = $1 AND client_id = $2",
      [dependentId, clientId]
    );

    // If dependent had their own address (not same as client), delete it
    if (dependent.address_id && !dependent.same_address) {
      await conn.query(
        "DELETE FROM addresses WHERE id = $1 AND client_id = $2",
        [dependent.address_id, clientId]
      );
    }

    await conn.query("COMMIT");
    return res.json({
      success: true,
      id: dependentId,
      message: "Dependent deleted successfully",
    });
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("deleteDependent error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

async function insertTaxRecord(req, res) {
  const clientId = req.params.id;
  const { taxYear, taxStatus, taxDate, hstRequired, createdById, preparedBy } =
    req.body;

  if (!taxYear) {
    return res.status(400).json({
      error: "validation_error",
      message: "taxYear is required",
    });
  }

  const yearInt = parseInt(taxYear, 10);
  if (isNaN(yearInt) || yearInt < 1900 || yearInt > 2100) {
    return res.status(400).json({
      error: "validation_error",
      message: "taxYear must be a valid year between 1900 and 2100",
    });
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Verify client exists
    const clientCheck = await conn.query(
      "SELECT id FROM clients WHERE id = $1",
      [clientId]
    );
    if (!clientCheck.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "client_not_found" });
    }

    // Check if tax record already exists
    const existingRecord = await conn.query(
      "SELECT id FROM tax_records WHERE client_id = $1 AND tax_year = $2",
      [clientId, yearInt]
    );

    if (existingRecord.rows.length > 0) {
      await conn.query("ROLLBACK");
      return res.status(409).json({
        error: "duplicate_record",
        message: `Tax record for year ${yearInt} already exists for this client`,
      });
    }

    // Insert new tax record (removed last_updated, NOW() - let trigger handle it)
    const result = await conn.query(
      `INSERT INTO tax_records 
       (client_id, tax_year, tax_status, tax_date, hst_required, created_by, prepared_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        clientId,
        yearInt,
        taxStatus || null,
        taxDate || null,
        hstRequired !== undefined ? hstRequired : null,
        createdById,
        preparedBy,
      ]
    );

    await conn.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("insertTaxRecord error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

async function deleteTaxRecord(req, res) {
  const clientId = req.params.id;
  const taxId = req.params.taxId;

  if (!taxId) {
    return res.status(400).json({ error: "tax_id_required" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM tax_records WHERE client_id = $1 AND id = $2 RETURNING id, tax_year",
      [clientId, taxId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "tax_record_not_found",
        message: "Tax record not found for this client and year",
      });
    }

    return res.json({
      success: true,
      message: "Tax record deleted successfully",
    });
  } catch (err) {
    console.error("deleteTaxRecord error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  }
}

async function patchTaxRecord(req, res) {
  const { id: clientId, taxId } = req.params;
  const payload = req.body || {};
  const updatedBy = req.user?.id || null;

  if (!updatedBy) return res.status(401).json({ error: "unauthenticated" });
  if (!clientId || !taxId) return res.status(400).json({ error: "invalid_id" });

  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");

    // Verify tax record belongs to client
    const checkRes = await conn.query(
      `SELECT id FROM tax_records WHERE id = $1 AND client_id = $2 FOR UPDATE`,
      [taxId, clientId]
    );

    if (!checkRes.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "tax_record_not_found" });
    }

    // Build update query
    const setters = [];
    const params = [];

    function addSetter(column, value) {
      setters.push(`${column} = $${params.length + 1}`);
      params.push(value);
    }

    if (payload.tax_year !== undefined) addSetter("tax_year", payload.tax_year);
    if (payload.tax_status !== undefined)
      addSetter("tax_status", payload.tax_status);
    if (payload.tax_date !== undefined) addSetter("tax_date", payload.tax_date);
    if (payload.prepared_by !== undefined)
      addSetter("prepared_by", payload.prepared_by);
    if (payload.hst_required !== undefined)
      addSetter("hst_required", payload.hst_required);

    if (setters.length === 0) {
      await conn.query("ROLLBACK");
      return res.status(400).json({ error: "no_changes_provided" });
    }

    // Add updated_at
    addSetter("last_updated", new Date());

    // Execute update
    const idPlaceholder = `$${params.length + 1}`;
    const sql = `UPDATE tax_records SET ${setters.join(
      ", "
    )} WHERE id = ${idPlaceholder}`;
    const finalParams = params.concat([taxId]);

    const result = await conn.query(sql, finalParams);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      return res.status(409).json({ error: "tax_record_not_updated" });
    }

    await conn.query("COMMIT");

    // Fetch updated record
    const { rows } = await pool.query(
      `SELECT * FROM tax_records WHERE id = $1`,
      [taxId]
    );

    return res.json({
      success: true,
      message: "Tax record updated successfully",
      taxRecord: rows[0],
    });
  } catch (err) {
    try {
      await conn.query("ROLLBACK");
    } catch (e) {
      console.error("rollback failed:", e);
    }
    console.error("patchTaxRecord error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

async function patchDependent(req, res) {
  const { id: clientId, dependentId } = req.params;
  const payload = req.body || {};
  const updatedBy = req.user?.id || null;

  if (!updatedBy) return res.status(401).json({ error: "unauthenticated" });
  if (!clientId || !dependentId)
    return res.status(400).json({ error: "invalid_id" });

  const conn = await pool.connect();

  try {
    await conn.query("BEGIN");

    // Verify dependent belongs to client
    const checkRes = await conn.query(
      `SELECT id FROM dependants WHERE id = $1 AND client_id = $2 FOR UPDATE`,
      [dependentId, clientId]
    );

    if (!checkRes.rows.length) {
      await conn.query("ROLLBACK");
      return res.status(404).json({ error: "dependent_not_found" });
    }

    // Build update query
    const setters = [];
    const params = [];

    function addSetter(column, value) {
      setters.push(`${column} = $${params.length + 1}`);
      params.push(value);
    }

    if (payload.first_name !== undefined)
      addSetter("first_name", payload.first_name);
    if (payload.last_name !== undefined)
      addSetter("last_name", payload.last_name);
    if (payload.dob !== undefined) addSetter("dob", payload.dob);
    if (payload.relationship !== undefined)
      addSetter("relationship", payload.relationship);
    if (payload.disability !== undefined)
      addSetter("disability", payload.disability);
    if (payload.disability_notes !== undefined)
      addSetter("disability_notes", payload.disability_notes);

    if (setters.length === 0) {
      await conn.query("ROLLBACK");
      return res.status(400).json({ error: "no_changes_provided" });
    }

    // Execute update
    const idPlaceholder = `$${params.length + 1}`;
    const sql = `UPDATE dependants SET ${setters.join(
      ", "
    )} WHERE id = ${idPlaceholder}`;
    const finalParams = params.concat([dependentId]);

    const result = await conn.query(sql, finalParams);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      return res.status(409).json({ error: "dependent_not_updated" });
    }

    await conn.query("COMMIT");

    // Fetch updated record
    const { rows } = await pool.query(
      `SELECT * FROM dependants WHERE id = $1`,
      [dependentId]
    );

    return res.json({
      success: true,
      message: "Dependent updated successfully",
      dependent: rows[0],
    });
  } catch (err) {
    try {
      await conn.query("ROLLBACK");
    } catch (e) {
      console.error("rollback failed:", e);
    }
    console.error("patchDependent error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  } finally {
    conn.release();
  }
}

// Export all functions
module.exports = {
  listClients,
  createPersonal,
  getClient,
  deleteClient,
  patchClient,
  createBulk,
  // New functions
  insertAddress,
  deleteAddress,
  insertDependent,
  deleteDependent,
  insertTaxRecord,
  deleteTaxRecord,
  patchDependent,
  patchTaxRecord,
  insertNote,
  deleteNote,
};
