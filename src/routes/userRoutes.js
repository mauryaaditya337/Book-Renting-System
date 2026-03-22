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
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "bio",
  "avatarUrl"
];
const allowedSignupFields = ["name", "email", "password"];
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
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
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
    .withMessage("Password must be at least 6 characters long")
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
  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be a string")
    .bail()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone must be between 7 and 20 characters"),
  body("addressLine1")
    .optional()
    .isString()
    .withMessage("Address line 1 must be a string")
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Address line 1 must be less than 120 characters"),
  body("addressLine2")
    .optional()
    .isString()
    .withMessage("Address line 2 must be a string")
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Address line 2 must be less than 120 characters"),
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
  body("pincode")
    .optional()
    .isString()
    .withMessage("Pincode must be a string")
    .bail()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Pincode must be between 3 and 20 characters"),
  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters"),
  body("avatarUrl")
    .optional()
    .isString()
    .withMessage("Avatar URL must be a string")
    .bail()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Avatar URL must be less than 300 characters")
    .bail()
    .custom((value) => {
      if (value === "") {
        return true;
      }

      try {
        new URL(value);
        return true;
      } catch (error) {
        throw new Error("Avatar URL must be a valid URL");
      }
    })
];

router.post("/signup", signupValidation, signupUser);
router.post("/login", loginValidation, loginUser);
router.get("/me", protect, getCurrentUserProfile);
router.put("/me", protect, updateProfileValidation, updateCurrentUserProfile);

module.exports = router;
