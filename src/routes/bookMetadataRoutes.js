const express = require("express");
const { param } = require("express-validator");

const { getBookMetadataByIsbnController } = require("../controllers/bookMetadataController");

const router = express.Router();

router.get(
  "/isbn/:isbn",
  [
    param("isbn")
      .isString()
      .withMessage("ISBN must be a string")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("ISBN is required")
  ],
  getBookMetadataByIsbnController
);

module.exports = router;
