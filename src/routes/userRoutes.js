const express = require("express");
const { body } = require("express-validator");

const {
  signupUser,
  loginUser,
  getCurrentUserProfile,
  updateCurrentUserProfile
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const allowedProfileUpdateFields = [
  "fullName",
  "collegeName",
  "phoneNumber",
  "city",
  "state",
  "address",
  "bio",
  "qualification",
  "currentDegree"
];
const allowedSignupFields = ["fullName", "email", "password", "collegeName", "phoneNumber"];
const allowedLoginFields = ["email", "password"];

const signupValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedSignupFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 80 })
    .withMessage("Full name must be between 2 and 80 characters"),
  body("collegeName")
    .trim()
    .notEmpty()
    .withMessage("College name is required")
    .isLength({ min: 2, max: 120 })
    .withMessage("College name must be between 2 and 120 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("phoneNumber")
    .optional()
    .isString()
    .withMessage("Phone number must be a string")
    .bail()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone number must be between 7 and 20 characters")
];

const loginValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);
    const unknownFields = keys.filter((key) => !allowedLoginFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
];

const updateProfileValidation = [
  body().custom((value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("Request body must be a valid JSON object");
    }

    const keys = Object.keys(value);

    if (keys.length === 0) {
      throw new Error("At least one profile field is required");
    }

    const hasPasswordField = keys.includes("password");

    if (hasPasswordField) {
      throw new Error("Password updates are not allowed in this route");
    }

    const unknownFields = keys.filter((key) => !allowedProfileUpdateFields.includes(key));

    if (unknownFields.length > 0) {
      throw new Error(`Unknown field(s): ${unknownFields.join(", ")}`);
    }

    return true;
  }),
  body("fullName")
    .optional()
    .isString()
    .withMessage("Full name must be a string")
    .bail()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Full name must be between 2 and 80 characters"),
  body("collegeName")
    .optional()
    .isString()
    .withMessage("College name must be a string")
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("College name must be between 2 and 120 characters"),
  body("phoneNumber")
    .optional()
    .isString()
    .withMessage("Phone number must be a string")
    .bail()
    .trim()
    .custom((value) => value === "" || (value.length >= 7 && value.length <= 20))
    .withMessage("Phone number must be empty or between 7 and 20 characters"),
  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string")
    .bail()
    .trim()
    .isLength({ max: 240 })
    .withMessage("Address must be less than 240 characters"),
  body("city")
    .optional()
    .isString()
    .withMessage("City must be a string")
    .bail()
    .trim()
    .isLength({ max: 60 })
    .withMessage("City must be less than 60 characters"),
  body("state")
    .optional()
    .isString()
    .withMessage("State must be a string")
    .bail()
    .trim()
    .isLength({ max: 60 })
    .withMessage("State must be less than 60 characters"),
  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters"),
  body("qualification")
    .optional()
    .isString()
    .withMessage("Qualification must be a string")
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Qualification must be less than 120 characters"),
  body("currentDegree")
    .optional()
    .isString()
    .withMessage("Current degree must be a string")
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Current degree must be less than 120 characters")
];

router.post("/signup", signupValidation, signupUser);
router.post("/login", loginValidation, loginUser);
router.get("/me", protect, getCurrentUserProfile);
router.put("/me", protect, updateProfileValidation, updateCurrentUserProfile);

module.exports = router;
