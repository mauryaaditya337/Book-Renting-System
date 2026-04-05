const asyncHandler = require("../middleware/asyncHandler");
const User = require("../models/User");

const formatAdminUser = (user) => ({
  _id: user._id,
  fullName: user.fullName || user.name || "",
  name: user.name || user.fullName || "",
  email: user.email || "",
  isAdmin: Boolean(user.isAdmin),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const buildUserSearchFilter = (search = "") => {
  const trimmedSearch = String(search || "").trim();

  if (!trimmedSearch) {
    return {};
  }

  const safePattern = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(safePattern, "i");

  return {
    $or: [{ fullName: regex }, { name: regex }, { email: regex }]
  };
};

const getAdminUsers = asyncHandler(async (req, res) => {
  const filters = buildUserSearchFilter(req.query.search);

  const users = await User.find(filters)
    .select("fullName name email isAdmin createdAt updatedAt")
    .sort({ createdAt: -1 });

  res.status(200).json({
    users: users.map(formatAdminUser)
  });
});

const getAdminUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "fullName name email isAdmin collegeName phoneNumber phone city state address bio qualification currentDegree createdAt updatedAt"
  );

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    user: {
      ...formatAdminUser(user),
      collegeName: user.collegeName || "",
      phoneNumber: user.phoneNumber || user.phone || "",
      city: user.city || "",
      state: user.state || "",
      address: user.address || "",
      bio: user.bio || "",
      qualification: user.qualification || "",
      currentDegree: user.currentDegree || ""
    }
  });
});

module.exports = {
  getAdminUsers,
  getAdminUserById
};
