const express = require("express");
const { param, query } = require("express-validator");

const { getAdminBooks, getAdminBookById } = require("../controllers/adminBookController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const allowedQueryParams = ["search", "listingType", "availabilityStatus"];
const allowedListingTypes = ["rent", "sell", "both"];
const allowedAvailabilityStatuses = ["available", "reserved", "rented", "sold"];

const adminBooksQueryValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedQueryParams.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .bail()
    .trim(),
  query("listingType")
    .optional()
    .isIn(allowedListingTypes)
    .withMessage("Listing type must be one of: rent, sell, both"),
  query("availabilityStatus")
    .optional()
    .isIn(allowedAvailabilityStatuses)
    .withMessage("Availability status must be one of: available, reserved, rented, sold"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const bookIdValidation = [
  param("id").isMongoId().withMessage("Book id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get("/", protect, adminOnly, adminBooksQueryValidation, getAdminBooks);
router.get("/:id", protect, adminOnly, bookIdValidation, getAdminBookById);

module.exports = router;
