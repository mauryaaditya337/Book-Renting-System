const express = require("express");
const { param, query } = require("express-validator");

const { getAdminUsers, getAdminUserById } = require("../controllers/adminUserController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validateRequest");

const router = express.Router();

const allowedQueryParams = ["search"];

const adminUsersQueryValidation = [
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
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

const userIdValidation = [
  param("id").isMongoId().withMessage("User id must be a valid MongoDB ObjectId"),
  (req, res, next) => {
    validateRequest(req);
    next();
  }
];

router.get("/", protect, adminOnly, adminUsersQueryValidation, getAdminUsers);
router.get("/:id", protect, adminOnly, userIdValidation, getAdminUserById);

module.exports = router;
