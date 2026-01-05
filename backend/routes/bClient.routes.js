const express = require("express");
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
router.delete("/:businessId/notes/:noteId", deleteNote);

// export router
module.exports = router;
