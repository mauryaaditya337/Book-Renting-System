const bcrypt = require("bcryptjs");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");

const formatUserProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  addressLine1: user.addressLine1 || "",
  addressLine2: user.addressLine2 || "",
  city: user.city || "",
  state: user.state || "",
  pincode: user.pincode || "",
  bio: user.bio || "",
  avatarUrl: user.avatarUrl || "",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const signupUser = asyncHandler(async (req, res) => {
  validateRequest(req);

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword
  });

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});

const loginUser = asyncHandler(async (req, res) => {
  validateRequest(req);

  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id);

  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: formatUserProfile(req.user)
  });
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  validateRequest(req);

  const allowedFields = [
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "pincode",
    "bio",
    "avatarUrl"
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      req.user[field] = req.body[field];
    }
  }

  const updatedUser = await req.user.save();

  res.status(200).json({
    message: "Profile updated successfully",
    user: formatUserProfile(updatedUser)
  });
});

module.exports = {
  signupUser,
  loginUser,
  getCurrentUserProfile,
  updateCurrentUserProfile
};
