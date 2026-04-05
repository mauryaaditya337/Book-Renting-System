const Wallet = require("../models/Wallet");
const WalletRequest = require("../models/WalletRequest");
const WalletTransaction = require("../models/WalletTransaction");
const RentalRequest = require("../models/RentalRequest");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const {
  getOrCreateWallet,
  creditGeneralBalance,
  debitGeneralBalance,
  runWalletOperationInTransaction
} = require("../services/walletService");

const formatWallet = (wallet) => ({
  _id: wallet._id,
  user: wallet.user,
  generalBalance: wallet.generalBalance,
  lockedBalance: wallet.lockedBalance,
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt
});

const formatWalletTransactionUser = (user) => {
  if (!user) {
    return null;
  }

  if (typeof user === "object" && user._id) {
    return {
      _id: user._id,
      fullName: user.fullName || user.name || "",
      email: user.email || ""
    };
  }

  return user;
};

const formatWalletTransaction = (transaction) => ({
  _id: transaction._id,
  user: formatWalletTransactionUser(transaction.user),
  type: transaction.type,
  amount: transaction.amount,
  status: transaction.status,
  referenceId: transaction.referenceId,
  description: transaction.description || "",
  metadata: transaction.metadata,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt
});

const formatWalletRequestUser = (user) => {
  if (!user) {
    return null;
  }

  if (typeof user === "object" && user._id) {
    return {
      _id: user._id,
      fullName: user.fullName || user.name || "",
      email: user.email || ""
    };
  }

  return user;
};

const formatWalletRequest = (walletRequest) => ({
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
});

const formatLockedRentalBook = (book) => {
  if (!book) {
    return null;
  }

  return {
    _id: book._id,
    title: book.title || "",
    listingType: book.listingType || ""
  };
};

const formatLockedRentalUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    fullName: user.fullName || user.name || "",
    name: user.name || user.fullName || "",
    email: user.email || ""
  };
};

const formatLockedRentalRequestBase = (rentalRequest) => ({
  _id: rentalRequest._id,
  status: rentalRequest.status,
  paymentStatus: rentalRequest.paymentStatus,
  settlementStatus: rentalRequest.settlementStatus,
  lockedRent: rentalRequest.lockedRent,
  lockedDeposit: rentalRequest.lockedDeposit,
  totalLockedAmount: rentalRequest.totalLockedAmount,
  paymentConfirmedAt: rentalRequest.paymentConfirmedAt,
  fundsLockedAt: rentalRequest.fundsLockedAt,
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt,
  book: formatLockedRentalBook(rentalRequest.book)
});

const formatRenterLockedRentalRequest = (rentalRequest) => ({
  ...formatLockedRentalRequestBase(rentalRequest),
  owner: formatLockedRentalUser(rentalRequest.owner)
});

const formatOwnerLockedRentalRequest = (rentalRequest) => ({
  ...formatLockedRentalRequestBase(rentalRequest),
  renter: formatLockedRentalUser(rentalRequest.renter)
});

const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOneAndUpdate(
    { user: req.user._id },
    {
      $setOnInsert: {
        user: req.user._id,
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

  res.status(200).json({
    wallet: formatWallet(wallet)
  });
});

const creditUserWallet = asyncHandler(async (req, res) => {
  const { userId, amount, description = "" } = req.body;

  const { wallet } = await runWalletOperationInTransaction(async (session) => {
    const user = await User.findById(userId).session(session);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return creditGeneralBalance(
      {
        userId,
        amount,
        description: description || "Admin wallet credit",
        metadata: {
          source: "admin_credit",
          adminUserId: req.user._id
        }
      },
      { session }
    );
  });

  res.status(200).json({
    message: "Wallet credited successfully",
    wallet: formatWallet(wallet)
  });
});

const debitUserWallet = asyncHandler(async (req, res) => {
  const { userId, amount, description = "" } = req.body;

  const { wallet } = await runWalletOperationInTransaction(async (session) => {
    const user = await User.findById(userId).session(session);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return debitGeneralBalance(
      {
        userId,
        amount,
        description: description || "Admin wallet debit",
        metadata: {
          source: "admin_debit",
          adminUserId: req.user._id
        }
      },
      { session }
    );
  });

  res.status(200).json({
    message: "Wallet debited successfully",
    wallet: formatWallet(wallet)
  });
});

const createWalletRequest = asyncHandler(async (req, res) => {
  const walletRequest = await WalletRequest.create({
    user: req.user._id,
    amount: req.body.amount,
    note: req.body.note || ""
  });

  res.status(201).json({
    message: "Wallet request created successfully",
    walletRequest: formatWalletRequest(walletRequest)
  });
});

const getMyWalletRequests = asyncHandler(async (req, res) => {
  const requests = await WalletRequest.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    walletRequests: requests.map(formatWalletRequest)
  });
});

const getAllWalletRequests = asyncHandler(async (req, res) => {
  const requests = await WalletRequest.find({})
    .populate("user", "fullName name email")
    .populate("approvedBy", "fullName name email")
    .populate("rejectedBy", "fullName name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    walletRequests: requests.map(formatWalletRequest)
  });
});

const approveWalletRequest = asyncHandler(async (req, res) => {
  const { wallet, walletRequestId } = await runWalletOperationInTransaction(async (session) => {
    const walletRequest = await WalletRequest.findOne({
      _id: req.params.id
    }).session(session);

    if (!walletRequest) {
      const error = new Error("Wallet request not found");
      error.statusCode = 404;
      throw error;
    }

    if (walletRequest.status !== "pending") {
      const error = new Error("Only pending wallet requests can be approved");
      error.statusCode = 400;
      throw error;
    }

    walletRequest.status = "approved";
    walletRequest.adminNote = req.body.adminNote || "";
    walletRequest.approvedBy = req.user._id;
    walletRequest.approvedAt = new Date();
    await walletRequest.save({ session });

    const creditResult = await creditGeneralBalance(
      {
        userId: walletRequest.user,
        amount: walletRequest.amount,
        referenceId: walletRequest._id,
        description: "Wallet request approved by admin",
        metadata: {
          walletRequestId: walletRequest._id,
          source: "wallet_request_approval",
          adminUserId: req.user._id
        }
      },
      { session }
    );

    return {
      wallet: creditResult.wallet,
      walletRequestId: walletRequest._id
    };
  });

  const populatedRequest = await WalletRequest.findById(walletRequestId)
    .populate("user", "fullName name email")
    .populate("approvedBy", "fullName name email")
    .populate("rejectedBy", "fullName name email");

  res.status(200).json({
    message: "Wallet request approved successfully",
    walletRequest: formatWalletRequest(populatedRequest),
    wallet: formatWallet(wallet)
  });
});

const rejectWalletRequest = asyncHandler(async (req, res) => {
  const rejectedAt = new Date();
  const walletRequest = await WalletRequest.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    {
      $set: {
        status: "rejected",
        adminNote: req.body.adminNote || "",
        rejectedBy: req.user._id,
        rejectedAt
      }
    },
    {
      new: true
    }
  );

  if (!walletRequest) {
    const existingRequest = await WalletRequest.findById(req.params.id);

    if (!existingRequest) {
      const error = new Error("Wallet request not found");
      error.statusCode = 404;
      throw error;
    }

    const error = new Error("Only pending wallet requests can be rejected");
    error.statusCode = 400;
    throw error;
  }

  const populatedRequest = await WalletRequest.findById(walletRequest._id)
    .populate("user", "fullName name email")
    .populate("approvedBy", "fullName name email")
    .populate("rejectedBy", "fullName name email");

  res.status(200).json({
    message: "Wallet request rejected successfully",
    walletRequest: formatWalletRequest(populatedRequest)
  });
});

const getMyWalletTransactions = asyncHandler(async (req, res) => {
  const transactions = await WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    transactions: transactions.map(formatWalletTransaction)
  });
});

const getMyLockedRentals = asyncHandler(async (req, res) => {
  const rentalRequests = await RentalRequest.find({
    renter: req.user._id,
    paymentStatus: "locked"
  })
    .populate("book", "title listingType")
    .populate("owner", "fullName name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    lockedRentals: rentalRequests.map(formatRenterLockedRentalRequest)
  });
});

const getOwnerLockedRentals = asyncHandler(async (req, res) => {
  const rentalRequests = await RentalRequest.find({
    owner: req.user._id,
    paymentStatus: "locked"
  })
    .populate("book", "title listingType")
    .populate("renter", "fullName name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    lockedRentals: rentalRequests.map(formatOwnerLockedRentalRequest)
  });
});

const getAllWalletTransactions = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.userId) {
    filters.user = req.query.userId;
  }

  if (req.query.type) {
    filters.type = req.query.type;
  }

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const transactions = await WalletTransaction.find(filters)
    .populate("user", "fullName name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    transactions: transactions.map(formatWalletTransaction)
  });
});

module.exports = {
  getMyWallet,
  creditUserWallet,
  debitUserWallet,
  createWalletRequest,
  getMyWalletRequests,
  getAllWalletRequests,
  approveWalletRequest,
  rejectWalletRequest,
  getMyWalletTransactions,
  getMyLockedRentals,
  getOwnerLockedRentals,
  getAllWalletTransactions
};
