const asyncHandler = require("../middleware/asyncHandler");
const WalletRequest = require("../models/WalletRequest");

function formatWalletRequestUser(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    fullName: user.fullName || user.name || "",
    name: user.name || user.fullName || "",
    email: user.email || ""
  };
}

function formatAdminWalletRequest(walletRequest) {
  return {
    _id: walletRequest._id,
    user: formatWalletRequestUser(walletRequest.user),
    amount: walletRequest.amount,
    status: walletRequest.status,
    note: walletRequest.note || "",
    adminNote: walletRequest.adminNote || "",
    approvedBy: formatWalletRequestUser(walletRequest.approvedBy),
    rejectedBy: formatWalletRequestUser(walletRequest.rejectedBy),
    approvedAt: walletRequest.approvedAt,
    rejectedAt: walletRequest.rejectedAt,
    createdAt: walletRequest.createdAt,
    updatedAt: walletRequest.updatedAt
  };
}

const getAdminWalletRequestById = asyncHandler(async (req, res) => {
  const walletRequest = await WalletRequest.findById(req.params.id)
    .populate("user", "fullName name email")
    .populate("approvedBy", "fullName name email")
    .populate("rejectedBy", "fullName name email");

  if (!walletRequest) {
    const error = new Error("Wallet request not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    walletRequest: formatAdminWalletRequest(walletRequest)
  });
});

module.exports = {
  getAdminWalletRequestById
};
