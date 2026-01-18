const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  getDashboardCounts,
  getStatusCounts,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/counts", authenticateToken, getDashboardCounts);
router.get("/status-counts", authenticateToken, getStatusCounts);

module.exports = router;
