const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Wallet = require("../models/Wallet");
const generateToken = require("../utils/generateToken");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");

const formatCurrentUser = (user) => ({
  id: user._id,
  fullName: user.fullName || user.name || "",
  name: user.name || user.fullName || "",
  email: user.email,
  isAdmin: Boolean(user.isAdmin),
  collegeName: user.collegeName || "",
  phoneNumber: user.phoneNumber || user.phone || "",
  phone: user.phone || user.phoneNumber || "",
  city: user.city || "",
  state: user.state || "",
  address: user.address || user.addressLine1 || "",
  bio: user.bio || "",
  qualification: user.qualification || "",
  currentDegree: user.currentDegree || "",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const signupUser = asyncHandler(async (req, res) => {
  validateRequest(req);

  const { fullName, email, password, collegeName, phoneNumber = "" } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    fullName,
    name: fullName,
    collegeName,
    email: email.toLowerCase(),
    password: hashedPassword,
    phoneNumber,
    phone: phoneNumber
  });

  await Wallet.findOneAndUpdate(
    { user: user._id },
    {
      $setOnInsert: {
        user: user._id,
        generalBalance: 0,
        lockedBalance: 0
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  res.status(201).json({
    message: "User registered successfully",
    user: formatCurrentUser(user)
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
      email: user.email,
      isAdmin: Boolean(user.isAdmin)
    }
  });
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: formatCurrentUser(req.user)
  });
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  validateRequest(req);

  const allowedFields = [
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

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if (field === "fullName") {
        req.user.fullName = req.body.fullName;
        req.user.name = req.body.fullName;
        continue;
      }

      if (field === "phoneNumber") {
        req.user.phoneNumber = req.body.phoneNumber;
        req.user.phone = req.body.phoneNumber;
        continue;
      }

      req.user[field] = req.body[field];
    }
  }

  const updatedUser = await req.user.save();

  res.status(200).json({
    message: "Profile updated successfully",
    user: formatCurrentUser(updatedUser)
  });
});

module.exports = {
  signupUser,
  loginUser,
  getCurrentUserProfile,
  updateCurrentUserProfile
};
