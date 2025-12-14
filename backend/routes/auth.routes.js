const express = require("express");
const { requireRole } = require("../middleware/auth.middleware");
const { login, register } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", requireRole("admin"), register);
router.post("/login", login);

module.exports = router;
