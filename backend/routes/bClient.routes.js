const express = require("express");
const { requireRole } = require("../middleware/auth.middleware");
const {
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
  insertNote,
  deleteNote,
  patchNote,
  getTaxNotes,
  insertTaxNote,
  patchTaxNote,
  deleteTaxNote,
} = require("../controllers/bClient.controller");

const router = express.Router();

// core
router.get("/", listClients);
router.post("/", createBusiness);
router.get("/:id", getBusiness);
router.patch("/edit/:id", patchBusiness);
router.delete("/:id", deleteBusiness);

//tax records
router.post("/:businessId/tax-records", createTaxRecord);
router.patch("/:businessId/tax-records/:taxRecordId", patchTaxRecord);
router.delete("/:businessId/tax-records/:taxRecordId", deleteTaxRecord);

//shareholder
router.post("/:businessId/shareholders", createBusinessShareholder);
router.delete(
  "/:businessId/shareholders/:shareholderId",
  deleteBusinessShareholder
);

// notes
router.post("/:businessId/notes", insertNote);
router.delete("/:businessId/notes/:noteId", requireRole("admin"), deleteNote);
router.patch("/:businessId/notes/:noteId", requireRole("admin"), patchNote);

// tax notes
router.get("/tax-records/:taxRecordId/notes", getTaxNotes);

router.post("/tax-records/:taxRecordId/notes", insertTaxNote);

router.patch(
  "/tax-records/:taxRecordId/notes/:noteId",
  requireRole("admin"),
  patchTaxNote
);

router.delete(
  "/tax-records/:taxRecordId/notes/:noteId",
  requireRole("admin"),
  deleteTaxNote
);

// export router
module.exports = router;
