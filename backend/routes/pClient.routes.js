const express = require("express");
const {
  createPersonal,
  listClients,
  getClient,
  deleteClient,
  patchClient,
  createBulk,
  insertAddress,
  deleteAddress,
  insertDependent,
  deleteDependent,
  insertTaxRecord,
  deleteTaxRecord,
} = require("../controllers/pClient.Controller");

const router = express.Router();

// core
router.get("/", listClients);
router.post("/", createPersonal);
router.get("/:id", getClient);
router.patch("/edit/:id", patchClient);
router.delete("/:id", deleteClient);
router.post("/bulk", createBulk);

// ADDRESSES
router.post("/:id/addresses", insertAddress);
router.delete("/:id/addresses/:addressId", deleteAddress);

// DEPENDENTS
router.post("/:id/dependents", insertDependent);
router.delete("/:id/dependents/:dependentId", deleteDependent);

// TAX RECORDS
router.post("/:id/tax-records", insertTaxRecord);
router.delete("/:id/tax-records/:taxId", deleteTaxRecord);

// export router
module.exports = router;
