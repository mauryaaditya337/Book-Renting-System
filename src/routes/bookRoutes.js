const express = require("express");
const { body, param, query } = require("express-validator");
const {
  MIN_BOOK_IMAGES,
  getImagesFromPayload,
  validateImages
} = require("../utils/bookImages");

const {
  createBookListing,
  getBooks,
  getOwnBooks,
  getBookById,
  updateOwnBookListing,
  deleteOwnBookListing
} = require("../controllers/bookController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const allowedBookFields = [
  "title",
  "author",
  "isbn",
  "category",
  "description",
  "condition",
  "rentalPrice",
  "listingType",
  "salePrice",
  "securityDeposit",
  "location",
  "meetupLocation",
  "depositNote",
  "images",
  "imageUrl"
];
const allowedCreateBookFields = [
  "title",
  "author",
  "isbn",
  "category",
  "description",
  "condition",
  "rentalPrice",
  "listingType",
  "salePrice",
  "securityDeposit",
  "location",
  "meetupLocation",
  "depositNote",
  "images",
  "imageUrl"
];

const allowedConditions = ["New", "Like New", "Good", "Fair", "Poor"];
const allowedListingTypes = ["rent", "sell", "both"];
const allowedBookQueryParams = ["search", "category", "location", "sortBy", "sortOrder", "page", "limit"];

const validateBookImagesPayload = (payload, { required = false } = {}) => {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "images") && !Array.isArray(payload.images)) {
    throw new Error("Images must be an array of strings");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "imageUrl") && typeof payload.imageUrl !== "string") {
    throw new Error("Image URL must be a string");
  }

  const normalizedImages = getImagesFromPayload(payload);

  if (normalizedImages === null) {
    if (required) {
      throw new Error(`At least ${MIN_BOOK_IMAGES} image is required`);
    }

    return true;
  }

  validateImages(normalizedImages, { required });
  return true;
};

const validateListingTypePayload = (payload, { requireCompletePricing = false } = {}) => {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return true;
  }

  const listingType = payload.listingType || "rent";
  const hasRentalPrice = Object.prototype.hasOwnProperty.call(payload, "rentalPrice");
  const hasSalePrice = Object.prototype.hasOwnProperty.call(payload, "salePrice");
  const hasSecurityDeposit = Object.prototype.hasOwnProperty.call(payload, "securityDeposit");

  if (listingType === "sell") {
    if (requireCompletePricing && !hasSalePrice) {
      throw new Error("Sale price is required for sell listings");
    }

    return true;
  }

  if (listingType === "both") {
    if (requireCompletePricing && (!hasRentalPrice || !hasSalePrice || !hasSecurityDeposit)) {
      throw new Error("Rental price, security deposit, and sale price are required for listings available for rent and sale");
    }

    return true;
  }

  if (requireCompletePricing && (!hasRentalPrice || !hasSecurityDeposit)) {
    throw new Error("Rental price and security deposit are required for rent listings");
  }

  return true;
};

const browseBooksValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !allowedBookQueryParams.includes(key));

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
  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string")
    .bail()
    .trim(),
  query("location")
    .optional()
    .isString()
    .withMessage("Location must be a string")
    .bail()
    .trim(),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "rentalPrice"])
    .withMessage("sortBy must be either createdAt or rentalPrice"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be either asc or desc"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than or equal to 1")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be an integer between 1 and 50")
    .toInt()
];

const getBookByIdValidation = [
  param("id").isMongoId().withMessage("Book id must be a valid MongoDB ObjectId")
];

const getOwnBooksValidation = [
  query().custom((value, { req }) => {
    const queryKeys = Object.keys(req.query);
    const unknownFields = queryKeys.filter((key) => !["page", "limit"].includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown query param(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than or equal to 1")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be an integer between 1 and 50")
    .toInt()
];

const updateBookValidation = [
  param("id").isMongoId().withMessage("Book id must be a valid MongoDB ObjectId"),
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);

    if (keys.length === 0) {
      throw new Error("At least one field is required to update");
    }

    const blockedFields = ["owner", "_id", "createdAt", "updatedAt"].filter((key) => keys.includes(key));

    if (blockedFields.length > 0) {
      throw new Error(`Field(s) cannot be updated: ${blockedFields.join(", ")}`);
    }

    const unknownFields = keys.filter((key) => !allowedBookFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("author")
    .optional()
    .isString()
    .withMessage("Author must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Author cannot be empty"),
  body("isbn")
    .optional()
    .isString()
    .withMessage("ISBN must be a string")
    .bail()
    .trim(),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty"),
  body("condition")
    .optional()
    .isString()
    .withMessage("Condition must be a string")
    .bail()
    .trim()
    .isIn(allowedConditions)
    .withMessage("Condition must be one of: New, Like New, Good, Fair, Poor"),
  body("rentalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Rental price must be a number greater than or equal to 0")
    .toFloat(),
  body("salePrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Sale price must be a number greater than or equal to 0")
    .toFloat(),
  body("securityDeposit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Security deposit must be a number greater than or equal to 0")
    .toFloat(),
  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Location cannot be empty"),
  body("meetupLocation")
    .optional()
    .isString()
    .withMessage("Meetup instructions must be a string")
    .bail()
    .trim(),
  body("depositNote")
    .optional()
    .isString()
    .withMessage("Deposit note must be a string")
    .bail()
    .trim(),
  body("listingType")
    .optional()
    .isString()
    .withMessage("Listing type must be a string")
    .bail()
    .trim()
    .isIn(allowedListingTypes)
    .withMessage("Listing type must be one of: rent, sell, both"),
  body().custom((value) => {
    validateBookImagesPayload(value, { required: false });
    validateListingTypePayload(value, { requireCompletePricing: false });
    return true;
  })
];

const createBookValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);

    const blockedFields = ["owner", "availabilityStatus"].filter((key) => keys.includes(key));

    if (blockedFields.length > 0) {
      throw new Error(`Field(s) cannot be provided: ${blockedFields.join(", ")}`);
    }

    const unknownFields = keys.filter((key) => !allowedCreateBookFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("title")
    .exists({ checkFalsy: true })
    .withMessage("Title is required")
    .bail()
    .isString()
    .withMessage("Title must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Title is required"),
  body("author")
    .exists({ checkFalsy: true })
    .withMessage("Author is required")
    .bail()
    .isString()
    .withMessage("Author must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Author is required"),
  body("isbn")
    .optional()
    .isString()
    .withMessage("ISBN must be a string")
    .bail()
    .trim(),
  body("category")
    .exists({ checkFalsy: true })
    .withMessage("Category is required")
    .bail()
    .isString()
    .withMessage("Category must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Category is required"),
  body("description")
    .exists({ checkFalsy: true })
    .withMessage("Description is required")
    .bail()
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Description is required"),
  body("condition")
    .exists({ checkFalsy: true })
    .withMessage("Condition is required")
    .bail()
    .isString()
    .withMessage("Condition must be a string")
    .bail()
    .trim()
    .isIn(allowedConditions)
    .withMessage("Condition must be one of: New, Like New, Good, Fair, Poor"),
  body("rentalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Rental price must be a number greater than or equal to 0")
    .toFloat(),
  body("salePrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Sale price must be a number greater than or equal to 0")
    .toFloat(),
  body("securityDeposit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Security deposit must be a number greater than or equal to 0")
    .toFloat(),
  body("location")
    .exists({ checkFalsy: true })
    .withMessage("Location is required")
    .bail()
    .isString()
    .withMessage("Location must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Location is required"),
  body("meetupLocation")
    .optional()
    .isString()
    .withMessage("Meetup instructions must be a string")
    .bail()
    .trim(),
  body("depositNote")
    .optional()
    .isString()
    .withMessage("Deposit note must be a string")
    .bail()
    .trim(),
  body("listingType")
    .optional()
    .isString()
    .withMessage("Listing type must be a string")
    .bail()
    .trim()
    .isIn(allowedListingTypes)
    .withMessage("Listing type must be one of: rent, sell, both"),
  body().custom((value) => {
    validateBookImagesPayload(value, { required: true });
    validateListingTypePayload(value, { requireCompletePricing: true });
    return true;
  })
];

router.get("/", browseBooksValidation, getBooks);
router.get("/mine", protect, getOwnBooksValidation, getOwnBooks);
router.get("/:id", getBookByIdValidation, getBookById);
router.put("/:id", protect, updateBookValidation, updateOwnBookListing);
router.delete("/:id", protect, getBookByIdValidation, deleteOwnBookListing);
router.post("/", protect, createBookValidation, createBookListing);

module.exports = router;
