const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { getDashboardCounts } = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/counts", authenticateToken, getDashboardCounts);

module.exports = router;
