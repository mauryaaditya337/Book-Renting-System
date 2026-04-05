const asyncHandler = require("../middleware/asyncHandler");
const RentalRequest = require("../models/RentalRequest");

const allowedStatuses = ["pending", "approved", "active", "return_pending", "completed", "rejected"];
const allowedPaymentStatuses = ["unpaid", "locked", "settled", "refunded"];
const allowedSettlementStatuses = ["pending", "completed", "refunded"];

function formatAdminRentalUser(user) {
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

function formatAdminRentalBook(book) {
  if (!book) {
    return null;
  }

  return {
    _id: book._id,
    title: book.title || "",
    author: book.author || "",
    category: book.category || "",
    listingType: book.listingType || "rent",
    rentalPrice: typeof book.rentalPrice === "number" ? book.rentalPrice : null,
    salePrice: typeof book.salePrice === "number" ? book.salePrice : null,
    securityDeposit: typeof book.securityDeposit === "number" ? book.securityDeposit : null
  };
}

function formatAdminRentalListItem(rentalRequest) {
  return {
    _id: rentalRequest._id,
    status: rentalRequest.status,
    paymentStatus: rentalRequest.paymentStatus,
    settlementStatus: rentalRequest.settlementStatus,
    totalRent: rentalRequest.totalRent,
    lockedRent: rentalRequest.lockedRent,
    lockedDeposit: rentalRequest.lockedDeposit,
    totalLockedAmount: rentalRequest.totalLockedAmount,
    createdAt: rentalRequest.createdAt,
    updatedAt: rentalRequest.updatedAt,
    actualStartDate: rentalRequest.actualStartDate,
    actualReturnDate: rentalRequest.actualReturnDate,
    book: rentalRequest.book
      ? {
          _id: rentalRequest.book._id,
          title: rentalRequest.book.title || "",
          listingType: rentalRequest.book.listingType || "rent"
        }
      : null,
    renter: formatAdminRentalUser(rentalRequest.renter),
    owner: formatAdminRentalUser(rentalRequest.owner)
  };
}

function formatAdminRentalDetail(rentalRequest) {
  return {
    ...formatAdminRentalListItem(rentalRequest),
    startDate: rentalRequest.startDate,
    endDate: rentalRequest.endDate,
    weeklyRentSnapshot: rentalRequest.weeklyRentSnapshot,
    perDayRentSnapshot: rentalRequest.perDayRentSnapshot,
    rentalDays: rentalRequest.rentalDays,
    paymentConfirmedAt: rentalRequest.paymentConfirmedAt,
    fundsLockedAt: rentalRequest.fundsLockedAt,
    settledAt: rentalRequest.settledAt,
    depositRefundedAt: rentalRequest.depositRefundedAt,
    rentReleasedAt: rentalRequest.rentReleasedAt,
    financialActionVersion: rentalRequest.financialActionVersion,
    paymentReference: rentalRequest.paymentReference || "",
    rejectionReason: rentalRequest.rejectionReason || "",
    book: formatAdminRentalBook(rentalRequest.book)
  };
}

function buildAdminRentalFilters(query = {}) {
  const filters = {};

  if (allowedStatuses.includes(query.status)) {
    filters.status = query.status;
  }

  if (allowedPaymentStatuses.includes(query.paymentStatus)) {
    filters.paymentStatus = query.paymentStatus;
  }

  if (allowedSettlementStatuses.includes(query.settlementStatus)) {
    filters.settlementStatus = query.settlementStatus;
  }

  return filters;
}

function matchesSearch(rentalRequest, search) {
  const trimmedSearch = String(search || "").trim().toLowerCase();

  if (!trimmedSearch) {
    return true;
  }

  const values = [
    rentalRequest.book?.title,
    rentalRequest.renter?.fullName,
    rentalRequest.renter?.name,
    rentalRequest.owner?.fullName,
    rentalRequest.owner?.name
  ];

  return values.some((value) => String(value || "").toLowerCase().includes(trimmedSearch));
}

const getAdminRentals = asyncHandler(async (req, res) => {
  const filters = buildAdminRentalFilters(req.query);

  const rentalRequests = await RentalRequest.find(filters)
    .populate("book", "title listingType")
    .populate("renter", "fullName name email")
    .populate("owner", "fullName name email")
    .sort({ createdAt: -1, _id: -1 });

  const filteredRequests = rentalRequests.filter((rentalRequest) =>
    matchesSearch(rentalRequest, req.query.search)
  );

  res.status(200).json({
    rentalRequests: filteredRequests.map(formatAdminRentalListItem)
  });
});

const getAdminRentalById = asyncHandler(async (req, res) => {
  const rentalRequest = await RentalRequest.findById(req.params.id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("renter", "fullName name email")
    .populate("owner", "fullName name email");

  if (!rentalRequest) {
    const error = new Error("Rental request not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    rentalRequest: formatAdminRentalDetail(rentalRequest)
  });
});

module.exports = {
  getAdminRentals,
  getAdminRentalById
};
