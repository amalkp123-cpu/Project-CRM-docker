const express = require("express");
const {
  requireRole,
  authenticateToken,
} = require("../middleware/auth.middleware");
const {
  getProfile,
  getAllUsers,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

const router = express.Router();

router.get("/profile/:id", authenticateToken, getProfile);
router.get("/profile", authenticateToken, getProfile);
router.get("/", requireRole("admin"), getAllUsers);
router.patch("/:id", authenticateToken, updateUser);
router.delete("/:id", requireRole("admin"), deleteUser);

module.exports = router;
