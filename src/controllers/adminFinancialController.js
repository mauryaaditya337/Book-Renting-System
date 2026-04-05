const asyncHandler = require("../middleware/asyncHandler");
const RentalRequest = require("../models/RentalRequest");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const WalletRequest = require("../models/WalletRequest");
const WalletTransaction = require("../models/WalletTransaction");
const { getOrCreateWallet } = require("../services/walletService");

const formatFinancialUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    fullName: user.fullName || user.name || "",
    email: user.email || ""
  };
};

const formatFinancialBook = (book) => {
  if (!book) {
    return null;
  }

  return {
    _id: book._id,
    title: book.title || "",
    listingType: book.listingType || "",
    securityDeposit: book.securityDeposit ?? null
  };
};

const formatFinancialRentalRequest = (rentalRequest) => ({
  _id: rentalRequest._id,
  status: rentalRequest.status,
  paymentStatus: rentalRequest.paymentStatus,
  settlementStatus: rentalRequest.settlementStatus,
  lockedRent: rentalRequest.lockedRent,
  lockedDeposit: rentalRequest.lockedDeposit,
  totalLockedAmount: rentalRequest.totalLockedAmount,
  totalRent: rentalRequest.totalRent,
  paymentConfirmedAt: rentalRequest.paymentConfirmedAt,
  fundsLockedAt: rentalRequest.fundsLockedAt,
  settledAt: rentalRequest.settledAt,
  depositRefundedAt: rentalRequest.depositRefundedAt,
  rentReleasedAt: rentalRequest.rentReleasedAt,
  financialActionVersion: rentalRequest.financialActionVersion,
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt,
  book: formatFinancialBook(rentalRequest.book),
  renter: formatFinancialUser(rentalRequest.renter),
  owner: formatFinancialUser(rentalRequest.owner)
});

const formatWalletSummary = (wallet) => ({
  _id: wallet._id,
  user: wallet.user,
  generalBalance: wallet.generalBalance,
  lockedBalance: wallet.lockedBalance,
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt
});

const formatWalletTransaction = (transaction) => ({
  _id: transaction._id,
  type: transaction.type,
  amount: transaction.amount,
  status: transaction.status,
  description: transaction.description || "",
  referenceId: transaction.referenceId,
  metadata: transaction.metadata,
  createdAt: transaction.createdAt
});

const formatWalletRequest = (walletRequest) => ({
  _id: walletRequest._id,
  amount: walletRequest.amount,
  status: walletRequest.status,
  note: walletRequest.note || "",
  adminNote: walletRequest.adminNote || "",
  createdAt: walletRequest.createdAt,
  approvedAt: walletRequest.approvedAt,
  rejectedAt: walletRequest.rejectedAt
});

const formatUserLockedRental = (rentalRequest) => ({
  requestId: rentalRequest._id,
  status: rentalRequest.status,
  lockedRent: rentalRequest.lockedRent,
  lockedDeposit: rentalRequest.lockedDeposit,
  totalLockedAmount: rentalRequest.totalLockedAmount,
  bookTitle: rentalRequest.book?.title || "",
  ownerName: rentalRequest.owner?.fullName || rentalRequest.owner?.name || ""
});

const formatAuditIssueRental = (rentalRequest) => ({
  _id: rentalRequest._id,
  status: rentalRequest.status,
  paymentStatus: rentalRequest.paymentStatus,
  settlementStatus: rentalRequest.settlementStatus,
  lockedRent: rentalRequest.lockedRent,
  lockedDeposit: rentalRequest.lockedDeposit,
  totalLockedAmount: rentalRequest.totalLockedAmount,
  settledAt: rentalRequest.settledAt || null,
  depositRefundedAt: rentalRequest.depositRefundedAt || null,
  rentReleasedAt: rentalRequest.rentReleasedAt || null,
  book: formatFinancialBook(rentalRequest.book),
  renter: formatFinancialUser(rentalRequest.renter),
  owner: formatFinancialUser(rentalRequest.owner)
});

const formatAuditWalletMismatch = ({ owner, walletLockedBalance = 0, expectedLockedBalance = 0, lockedRentalCount = 0 }) => ({
  owner: formatFinancialUser(owner),
  walletLockedBalance,
  expectedLockedBalance,
  difference: walletLockedBalance - expectedLockedBalance,
  lockedRentalCount
});

const getAdminFinancialRentalRequests = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  if (req.query.paymentStatus) {
    filters.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.settlementStatus) {
    filters.settlementStatus = req.query.settlementStatus;
  }

  const rentalRequests = await RentalRequest.find(filters)
    .populate("book", "title listingType")
    .populate("renter", "fullName name email")
    .populate("owner", "fullName name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    rentalRequests: rentalRequests.map(formatFinancialRentalRequest)
  });
});

const getAdminFinancialSummary = asyncHandler(async (req, res) => {
  const [
    totalRentalRequests,
    activeLockedRentals,
    returnPendingCount,
    completedSettlements,
    lockedTotals
  ] = await Promise.all([
    RentalRequest.countDocuments({}),
    RentalRequest.countDocuments({ paymentStatus: "locked" }),
    RentalRequest.countDocuments({ status: "return_pending" }),
    RentalRequest.countDocuments({ settlementStatus: "completed" }),
    RentalRequest.aggregate([
      { $match: { paymentStatus: "locked" } },
      {
        $group: {
          _id: null,
          totalCurrentlyLockedAmount: { $sum: "$totalLockedAmount" },
          totalCurrentlyLockedRent: { $sum: "$lockedRent" },
          totalCurrentlyLockedDeposit: { $sum: "$lockedDeposit" }
        }
      }
    ])
  ]);

  const totals = lockedTotals[0] || {
    totalCurrentlyLockedAmount: 0,
    totalCurrentlyLockedRent: 0,
    totalCurrentlyLockedDeposit: 0
  };

  res.status(200).json({
    summary: {
      totalRentalRequests,
      activeLockedRentals,
      returnPendingCount,
      completedSettlements,
      totalCurrentlyLockedAmount: totals.totalCurrentlyLockedAmount,
      totalCurrentlyLockedRent: totals.totalCurrentlyLockedRent,
      totalCurrentlyLockedDeposit: totals.totalCurrentlyLockedDeposit
    }
  });
});

const getAdminFinancialRentalRequestById = asyncHandler(async (req, res) => {
  const rentalRequest = await RentalRequest.findById(req.params.id)
    .populate("book", "title listingType securityDeposit")
    .populate("renter", "fullName name email")
    .populate("owner", "fullName name email");

  if (!rentalRequest) {
    const error = new Error("Rental request not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    rentalRequest: {
      ...formatFinancialRentalRequest(rentalRequest),
      paymentReference: rentalRequest.paymentReference || ""
    }
  });
});

const getAdminFinancialUserWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select("fullName name email");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const wallet = await getOrCreateWallet(user._id);

  const [transactions, walletRequests, lockedRentals] = await Promise.all([
    WalletTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(20),
    WalletRequest.find({ user: user._id }).sort({ createdAt: -1 }),
    RentalRequest.find({
      renter: user._id,
      paymentStatus: "locked"
    })
      .populate("book", "title")
      .populate("owner", "fullName name")
      .sort({ createdAt: -1 })
  ]);

  res.status(200).json({
    user: formatFinancialUser(user),
    wallet: formatWalletSummary(wallet),
    transactions: transactions.map(formatWalletTransaction),
    walletRequests: walletRequests.map(formatWalletRequest),
    lockedRentals: lockedRentals.map(formatUserLockedRental)
  });
});

const getAdminFinancialAudit = asyncHandler(async (req, res) => {
  const [
    lockedWithoutAmount,
    settledButAmountsRemain,
    activeButUnpaid,
    returnPendingButNotLocked,
    completedButNotSettled,
    missingSettlementTimestamps,
    ownerLockedAggregates,
    ownerWallets
  ] = await Promise.all([
    RentalRequest.find({
      paymentStatus: "locked",
      totalLockedAmount: { $lte: 0 }
    })
      .populate("book", "title listingType securityDeposit")
      .populate("renter", "fullName name email")
      .populate("owner", "fullName name email")
      .sort({ createdAt: -1 }),
    RentalRequest.find({
      $and: [
        {
          $or: [{ paymentStatus: "settled" }, { settlementStatus: "completed" }]
        },
        {
          $or: [
            { lockedRent: { $gt: 0 } },
            { lockedDeposit: { $gt: 0 } },
            { totalLockedAmount: { $gt: 0 } }
          ]
        }
      ]
    })
      .populate("book", "title listingType securityDeposit")
      .populate("renter", "fullName name email")
      .populate("owner", "fullName name email")
      .sort({ createdAt: -1 }),
    RentalRequest.find({
      status: "active",
      paymentStatus: { $nin: ["locked", "settled"] }
    })
      .populate("book", "title listingType securityDeposit")
      .populate("renter", "fullName name email")
      .populate("owner", "fullName name email")
      .sort({ createdAt: -1 }),
    RentalRequest.find({
      status: "return_pending",
      paymentStatus: { $ne: "locked" }
    })
      .populate("book", "title listingType securityDeposit")
      .populate("renter", "fullName name email")
      .populate("owner", "fullName name email")
      .sort({ createdAt: -1 }),
    RentalRequest.find({
      status: "completed",
      $or: [{ settlementStatus: { $ne: "completed" } }, { paymentStatus: { $ne: "settled" } }]
    })
      .populate("book", "title listingType securityDeposit")
      .populate("renter", "fullName name email")
      .populate("owner", "fullName name email")
      .sort({ createdAt: -1 }),
    RentalRequest.find({
      settlementStatus: "completed",
      $or: [
        { settledAt: null },
        { depositRefundedAt: null },
        { rentReleasedAt: null }
      ]
    })
      .populate("book", "title listingType securityDeposit")
      .populate("renter", "fullName name email")
      .populate("owner", "fullName name email")
      .sort({ createdAt: -1 }),
    RentalRequest.aggregate([
      { $match: { paymentStatus: "locked" } },
      {
        $group: {
          _id: "$owner",
          expectedLockedBalance: { $sum: "$totalLockedAmount" },
          lockedRentalCount: { $sum: 1 }
        }
      }
    ]),
    Wallet.find({}).select("user lockedBalance").lean()
  ]);

  const walletByUserId = new Map(
    ownerWallets.map((wallet) => [String(wallet.user), wallet.lockedBalance || 0])
  );
  const ownerIds = ownerLockedAggregates.map((item) => item._id).filter(Boolean);
  const owners = await User.find({ _id: { $in: ownerIds } }).select("fullName name email").lean();
  const ownerById = new Map(owners.map((owner) => [String(owner._id), owner]));

  const ownerWalletLockedMismatch = ownerLockedAggregates
    .map((item) => {
      const ownerId = String(item._id);
      const expectedLockedBalance = item.expectedLockedBalance || 0;
      const walletLockedBalance = walletByUserId.get(ownerId) || 0;

      if (walletLockedBalance === expectedLockedBalance) {
        return null;
      }

      return formatAuditWalletMismatch({
        owner: ownerById.get(ownerId) || { _id: ownerId, fullName: "", email: "" },
        walletLockedBalance,
        expectedLockedBalance,
        lockedRentalCount: item.lockedRentalCount || 0
      });
    })
    .filter(Boolean)
    .sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));

  const issues = {
    lockedWithoutAmount: lockedWithoutAmount.map(formatAuditIssueRental),
    settledButAmountsRemain: settledButAmountsRemain.map(formatAuditIssueRental),
    activeButUnpaid: activeButUnpaid.map(formatAuditIssueRental),
    returnPendingButNotLocked: returnPendingButNotLocked.map(formatAuditIssueRental),
    completedButNotSettled: completedButNotSettled.map(formatAuditIssueRental),
    missingSettlementTimestamps: missingSettlementTimestamps.map(formatAuditIssueRental),
    ownerWalletLockedMismatch
  };

  res.status(200).json({
    audit: {
      summary: Object.fromEntries(
        Object.entries(issues).map(([key, value]) => [key, value.length])
      ),
      issues
    }
  });
});

module.exports = {
  getAdminFinancialRentalRequests,
  getAdminFinancialSummary,
  getAdminFinancialRentalRequestById,
  getAdminFinancialUserWallet,
  getAdminFinancialAudit
};
