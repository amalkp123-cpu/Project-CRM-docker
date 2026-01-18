const { pool } = require("../database/db");

exports.getDashboardCounts = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sql = `
      SELECT
        (SELECT COUNT(*) FROM clients)          AS personal_clients,
        (SELECT COUNT(*) FROM business_clients) AS business_clients
    `;

    const { rows } = await pool.query(sql);

    return res.json({
      personalClients: Number(rows[0].personal_clients),
      businessClients: Number(rows[0].business_clients),
      totalClients:
        Number(rows[0].personal_clients) + Number(rows[0].business_clients),
    });
  } catch (err) {
    console.error("Dashboard count error:", err);
    return res.status(500).json({ error: "server_error" });
  }
};

exports.getStatusCounts = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sql = `
      SELECT
        /* Personal */
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'InProgress')     AS progress_personal_clients,
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'ReadyForReview') AS review_personal_clients,
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'FiledOn')        AS filed_personal_clients,

        /* Business - HST */
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'InProgress'     AND tax_type = 'HST') AS progress_business_hst,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'ReadyForReview' AND tax_type = 'HST') AS review_business_hst,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'FiledOn'        AND tax_type = 'HST') AS filed_business_hst,

        /* Business - Corporation */
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'InProgress'     AND tax_type = 'CORPORATION') AS progress_business_corp,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'ReadyForReview' AND tax_type = 'CORPORATION') AS review_business_corp,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'FiledOn'        AND tax_type = 'CORPORATION') AS filed_business_corp
    `;

    const { rows } = await pool.query(sql);
    const r = rows[0];

    return res.json({
      progressPC: Number(r.progress_personal_clients),
      reviewPC: Number(r.review_personal_clients),
      filedOnPC: Number(r.filed_personal_clients),

      progressBC_HST: Number(r.progress_business_hst),
      reviewBC_HST: Number(r.review_business_hst),
      filedOnBC_HST: Number(r.filed_business_hst),

      progressBC_CORP: Number(r.progress_business_corp),
      reviewBC_CORP: Number(r.review_business_corp),
      filedOnBC_CORP: Number(r.filed_business_corp),
    });
  } catch (err) {
    console.error("Status count error:", err);
    return res.status(500).json({ error: "server_error" });
  }
};
