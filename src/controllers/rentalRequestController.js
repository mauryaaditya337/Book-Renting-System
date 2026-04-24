const Book = require("../models/Book");
const ChatThread = require("../models/ChatThread");
const RentalRequest = require("../models/RentalRequest");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");
const createNotification = require("../utils/createNotification");
const { calculateRentalPricing } = require("../utils/rentalPricing");
const {
  getOrCreateWallet,
  lockFundsForRentalEscrow,
  settleLockedRentalFunds,
  runWalletOperationInTransaction
} = require("../services/walletService");
const { attachCurrentUserReviewsToRequests } = require("../services/reviewService");

const CHAT_ENABLED_REQUEST_STATUSES = ["approved", "active", "return_pending"];
const FINAL_REQUEST_STATUSES = ["completed", "rejected", "cancelled", "expired"];
const CANCELABLE_RENTER_REQUEST_STATUSES = ["pending", "approved"];
const ACTIVE_REQUEST_STATUSES = ["pending", "approved", "active", "return_pending"];
const DEFAULT_PENDING_EXPIRY_DAYS = 7;

const normalizeDate = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getRentalPricingSnapshot = (rentalRequest) => {
  const pricing = calculateRentalPricing({
    weeklyRent:
      typeof rentalRequest.weeklyRentSnapshot === "number"
        ? rentalRequest.weeklyRentSnapshot
        : rentalRequest.book?.rentalPrice || 0,
    startDate: rentalRequest.startDate,
    endDate: rentalRequest.endDate
  });

  return {
    weeklyRent:
      typeof rentalRequest.weeklyRentSnapshot === "number"
        ? rentalRequest.weeklyRentSnapshot
        : pricing.weeklyRent,
    perDayRent:
      typeof rentalRequest.perDayRentSnapshot === "number"
        ? rentalRequest.perDayRentSnapshot
        : pricing.perDayRent,
    rentalDays:
      typeof rentalRequest.rentalDays === "number" && rentalRequest.rentalDays > 0
        ? rentalRequest.rentalDays
        : pricing.rentalDays,
    totalRent:
      typeof rentalRequest.totalRent === "number" ? rentalRequest.totalRent : pricing.totalRent
  };
};

const formatBookSummary = (book) => ({
  id: book?._id || "",
  title: book?.title || "Book unavailable",
  author: book?.author || "",
  category: book?.category || "",
  listingType: book?.listingType || "rent",
  rentalPrice: book?.rentalPrice ?? 0,
  salePrice: typeof book?.salePrice === "number" ? book.salePrice : null,
  securityDeposit: book?.securityDeposit ?? null
});

const formatUserSummary = (user, { includeFullName = false, includePhoneNumber = false } = {}) => ({
  id: user?._id || "",
  name: user?.name || user?.fullName || "Unknown user",
  ...(includeFullName ? { fullName: user?.fullName || user?.name || "" } : {}),
  ...(includePhoneNumber ? { phoneNumber: user?.phoneNumber || user?.phone || "" } : {})
});

const formatWalletSummary = (wallet) => ({
  _id: wallet?._id || "",
  user: wallet?.user || "",
  generalBalance: wallet?.generalBalance ?? 0,
  lockedBalance: wallet?.lockedBalance ?? 0,
  createdAt: wallet?.createdAt || null,
  updatedAt: wallet?.updatedAt || null
});

const formatRentalFinancialState = (rentalRequest) => ({
  paymentStatus: rentalRequest.paymentStatus || "unpaid",
  lockedRent: rentalRequest.lockedRent ?? 0,
  lockedDeposit: rentalRequest.lockedDeposit ?? 0,
  totalLockedAmount: rentalRequest.totalLockedAmount ?? 0,
  paymentConfirmedAt: rentalRequest.paymentConfirmedAt || null,
  fundsLockedAt: rentalRequest.fundsLockedAt || null,
  settlementStatus: rentalRequest.settlementStatus || "pending",
  settledAt: rentalRequest.settledAt || null,
  depositRefundedAt: rentalRequest.depositRefundedAt || null,
  rentReleasedAt: rentalRequest.rentReleasedAt || null,
  financialActionVersion: rentalRequest.financialActionVersion ?? 0,
  paymentReference: rentalRequest.paymentReference || ""
});

const formatRentalRequestResponse = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  book: formatBookSummary(rentalRequest.book),
  owner: formatUserSummary(rentalRequest.owner, { includeFullName: true, includePhoneNumber: true }),
  renter: formatUserSummary(rentalRequest.renter),
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt
});

const formatRentalRequestActionResponse = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  book: formatBookSummary(rentalRequest.book),
  renter: formatUserSummary(rentalRequest.renter, { includePhoneNumber: true }),
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt
});

const formatRentalRequestRenterActionResponse = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  ...formatRentalFinancialState(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  book: formatBookSummary(rentalRequest.book),
  owner: formatUserSummary(rentalRequest.owner, { includeFullName: true, includePhoneNumber: true }),
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt
});

const formatOwnerActiveRentalResponse = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: formatBookSummary(rentalRequest.book),
  renter: formatUserSummary(rentalRequest.renter, { includePhoneNumber: true })
});

const formatRenterActiveRentalResponse = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: formatBookSummary(rentalRequest.book),
  owner: formatUserSummary(rentalRequest.owner, { includeFullName: true, includePhoneNumber: true })
});

const formatIncomingRentalRequestListItem = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: formatBookSummary(rentalRequest.book),
  renter: formatUserSummary(rentalRequest.renter, { includePhoneNumber: true })
});

const formatOutgoingRentalRequestListItem = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  ...formatRentalFinancialState(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: formatBookSummary(rentalRequest.book),
  owner: formatUserSummary(rentalRequest.owner, { includeFullName: true, includePhoneNumber: true })
});

const formatOwnBookRentalRequestResponse = (rentalRequest) => ({
  ...getRentalPricingSnapshot(rentalRequest),
  id: rentalRequest._id,
  status: rentalRequest.status,
  rejectionReason: rentalRequest.rejectionReason || "",
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt,
  book: {
    id: rentalRequest.book?._id || "",
    title: rentalRequest.book?.title || "Book unavailable"
  },
  owner: formatUserSummary(rentalRequest.owner, { includeFullName: true, includePhoneNumber: true })
});

const buildRentalRequestListMeta = (page, limit, totalRequests) => ({
  totalRequests,
  currentPage: page,
  totalPages: Math.max(1, Math.ceil(totalRequests / limit))
});

const canUseChatForStatus = (status) => CHAT_ENABLED_REQUEST_STATUSES.includes(status);

const ensureChatThreadForRequest = async (rentalRequest) => {
  if (
    !rentalRequest ||
    !canUseChatForStatus(rentalRequest.status) ||
    !(rentalRequest.book?._id || rentalRequest.book) ||
    !(rentalRequest.owner?._id || rentalRequest.owner) ||
    !(rentalRequest.renter?._id || rentalRequest.renter)
  ) {
    return null;
  }

  return ChatThread.findOneAndUpdate(
    {
      requestId: rentalRequest._id
    },
    {
      $setOnInsert: {
        requestId: rentalRequest._id,
        bookId: rentalRequest.book?._id || rentalRequest.book,
        ownerId: rentalRequest.owner?._id || rentalRequest.owner,
        requesterId: rentalRequest.renter?._id || rentalRequest.renter
      },
      $set: {
        isOpen: true
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
};

const closeChatThreadForRequest = async (requestId) => {
  await ChatThread.findOneAndUpdate(
    {
      requestId
    },
    {
      $set: {
        isOpen: false
      }
    }
  );
};

const getPendingExpiryCutoffDate = (days = DEFAULT_PENDING_EXPIRY_DAYS) => {
  const normalizedDays = Number.isFinite(Number(days)) ? Number(days) : DEFAULT_PENDING_EXPIRY_DAYS;
  const safeDays = normalizedDays > 0 ? normalizedDays : DEFAULT_PENDING_EXPIRY_DAYS;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - safeDays);
  return cutoff;
};

const buildCancelledRequestMessage = (request, actor = "renter") => {
  if (actor === "owner") {
    return request.book?.listingType === "sell"
      ? "Owner cancelled the reservation"
      : "Owner cancelled the reservation";
  }

  return "Request was cancelled";
};

const attachChatMetadataToRequest = async (payload, rentalRequest) => {
  const thread = await ensureChatThreadForRequest(rentalRequest);

  return {
    ...payload,
    chat: {
      isAvailable: Boolean(thread),
      threadId: thread?._id ? String(thread._id) : ""
    }
  };
};

const attachChatMetadataToRequests = async (payloads, rentalRequests) => {
  const threads = await Promise.all(
    rentalRequests.map((rentalRequest) => ensureChatThreadForRequest(rentalRequest))
  );

  return payloads.map((payload, index) => ({
    ...payload,
    chat: {
      isAvailable: Boolean(threads[index]),
      threadId: threads[index]?._id ? String(threads[index]._id) : ""
    }
  }));
};

const ownerActiveRentalStatuses = ["approved", "active", "return_pending"];
const renterActiveRentalStatuses = ["active", "return_pending"];

const getRentalRequestForOwnerAction = async (requestId, userId) => {
  const rentalRequest = await RentalRequest.findById(requestId)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit owner")
    .populate("renter", "name phoneNumber phone");

  if (!rentalRequest) {
    const error = new Error("Rental request not found");
    error.statusCode = 404;
    throw error;
  }

  if (rentalRequest.owner.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to update this rental request");
    error.statusCode = 403;
    throw error;
  }

  return rentalRequest;
};

const getRentalRequestForRenterAction = async (requestId, userId) => {
  const rentalRequest = await RentalRequest.findById(requestId)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("owner", "fullName name phoneNumber phone");

  if (!rentalRequest) {
    const error = new Error("Rental request not found");
    error.statusCode = 404;
    throw error;
  }

  if (rentalRequest.renter.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to update this rental request");
    error.statusCode = 403;
    throw error;
  }

  return rentalRequest;
};

const cancelRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await getRentalRequestForRenterAction(req.params.id, req.user._id);

  if (!CANCELABLE_RENTER_REQUEST_STATUSES.includes(rentalRequest.status)) {
    const error = new Error("Only pending or approved requests can be cancelled");
    error.statusCode = 400;
    throw error;
  }

  const wasApproved = rentalRequest.status === "approved";

  rentalRequest.status = "cancelled";
  await rentalRequest.save();

  if (wasApproved) {
    await Book.findByIdAndUpdate(rentalRequest.book._id || rentalRequest.book, {
      $set: { availabilityStatus: "available" }
    });
  }

  await closeChatThreadForRequest(rentalRequest._id);

  createNotification({
    userId: rentalRequest.owner._id,
    type: "rental_request_cancelled",
    message: buildCancelledRequestMessage(rentalRequest, "renter"),
    relatedId: rentalRequest._id
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("owner", "fullName name phoneNumber phone");

  const responsePayload = await attachChatMetadataToRequest(
    formatRentalRequestRenterActionResponse(updatedRentalRequest),
    updatedRentalRequest
  );

  res.status(200).json({
    message: wasApproved ? "Reservation cancelled and book released successfully" : "Request cancelled successfully",
    rentalRequest: responsePayload
  });
});

const ownerCancelRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await getRentalRequestForOwnerAction(req.params.id, req.user._id);

  if (rentalRequest.status !== "approved") {
    const error = new Error("Only approved reservations can be cancelled by the owner");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "cancelled";
  await rentalRequest.save();

  await Book.findByIdAndUpdate(rentalRequest.book._id || rentalRequest.book, {
    $set: { availabilityStatus: "available" }
  });

  await closeChatThreadForRequest(rentalRequest._id);

  createNotification({
    userId: rentalRequest.renter._id,
    type: "rental_request_owner_cancelled",
    message: buildCancelledRequestMessage(rentalRequest, "owner"),
    relatedId: rentalRequest._id
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("renter", "name phoneNumber phone");

  const responsePayload = await attachChatMetadataToRequest(
    formatRentalRequestActionResponse(updatedRentalRequest),
    updatedRentalRequest
  );

  res.status(200).json({
    message: "Reservation cancelled and book released successfully",
    rentalRequest: responsePayload
  });
});

const expireStaleRentalRequests = asyncHandler(async (req, res) => {
  const cutoffDate = getPendingExpiryCutoffDate(req.body?.days);

  const staleRequests = await RentalRequest.find({
    status: "pending",
    createdAt: { $lt: cutoffDate }
  }).select("_id");

  if (staleRequests.length === 0) {
    res.status(200).json({
      message: "No stale pending requests found",
      expiredCount: 0
    });
    return;
  }

  const requestIds = staleRequests.map((request) => request._id);

  await RentalRequest.updateMany(
    {
      _id: { $in: requestIds }
    },
    {
      $set: {
        status: "expired"
      }
    }
  );

  await Promise.all(requestIds.map((requestId) => closeChatThreadForRequest(requestId)));

  res.status(200).json({
    message: "Stale pending requests expired successfully",
    expiredCount: requestIds.length
  });
});

const approveRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await getRentalRequestForOwnerAction(req.params.id, req.user._id);

  if (rentalRequest.status !== "pending") {
    const error = new Error("Only pending rental requests can be approved");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "approved";
  rentalRequest.rejectionReason = "";
  await rentalRequest.save();

  await RentalRequest.updateMany(
    {
      _id: { $ne: rentalRequest._id },
      book: rentalRequest.book._id,
      status: "pending"
    },
    {
      $set: { status: "rejected" }
    }
  );

  await Book.findByIdAndUpdate(rentalRequest.book._id, {
    $set: { availabilityStatus: rentalRequest.book.listingType === "sell" ? "sold" : "reserved" }
  });

  createNotification({
    userId: rentalRequest.renter._id,
    type: "rental_request_approved",
    message: "Your request has been approved",
    relatedId: rentalRequest._id
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("renter", "name phoneNumber phone");

  const responsePayload = await attachChatMetadataToRequest(
    formatRentalRequestActionResponse(updatedRentalRequest),
    updatedRentalRequest
  );

  res.status(200).json({
    message: "Rental request approved successfully",
    rentalRequest: responsePayload
  });
});

const rejectRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await getRentalRequestForOwnerAction(req.params.id, req.user._id);

  const rejectionReason = String(req.body.rejectionReason || "").trim();

  if (rentalRequest.status !== "pending") {
    const error = new Error("Only pending rental requests can be rejected");
    error.statusCode = 400;
    throw error;
  }

  if (!rejectionReason) {
    const error = new Error("Rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "rejected";
  rentalRequest.rejectionReason = rejectionReason;
  await rentalRequest.save();

  createNotification({
    userId: rentalRequest.renter._id,
    type: "rental_request_rejected",
    message: `Request rejected: ${rejectionReason}`,
    relatedId: rentalRequest._id
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("renter", "name phoneNumber phone");

  await closeChatThreadForRequest(updatedRentalRequest._id);

  res.status(200).json({
    message: "Rental request rejected successfully",
    rentalRequest: formatRentalRequestActionResponse(updatedRentalRequest)
  });
});

const startRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const { rentalRequestId, renterWallet, ownerWallet } = await runWalletOperationInTransaction(
    async (session) => {
      const rentalRequest = await RentalRequest.findById(req.params.id)
        .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
        .session(session);

      if (!rentalRequest) {
        const error = new Error("Rental request not found");
        error.statusCode = 404;
        throw error;
      }

      if (rentalRequest.renter.toString() !== req.user._id.toString()) {
        const error = new Error("You are not authorized to update this rental request");
        error.statusCode = 403;
        throw error;
      }

      if (rentalRequest.status === "active") {
        const error = new Error("Rental already started");
        error.statusCode = 400;
        throw error;
      }

      if (rentalRequest.status === "completed") {
        const error = new Error("This rental request has already been completed");
        error.statusCode = 400;
        throw error;
      }

      if (FINAL_REQUEST_STATUSES.includes(rentalRequest.status)) {
        const error = new Error("This rental request can no longer be started");
        error.statusCode = 400;
        throw error;
      }

      if (rentalRequest.status !== "approved") {
        const error = new Error("Only owner-approved rental requests can be started");
        error.statusCode = 400;
        throw error;
      }

      if (rentalRequest.paymentStatus !== "unpaid") {
        const error = new Error("This rental request is not eligible to start");
        error.statusCode = 400;
        throw error;
      }

      if (rentalRequest.book.listingType !== "rent") {
        const error = new Error("Only rent listings support rental actions");
        error.statusCode = 400;
        throw error;
      }

      const lockedRent = typeof rentalRequest.totalRent === "number" ? rentalRequest.totalRent : 0;
      const lockedDeposit =
        typeof rentalRequest.book.securityDeposit === "number" ? rentalRequest.book.securityDeposit : 0;
      const totalLockedAmount = lockedRent + lockedDeposit;

      if (lockedRent < 0 || lockedDeposit < 0 || totalLockedAmount <= 0) {
        const error = new Error("Invalid lock amount for this rental request");
        error.statusCode = 400;
        throw error;
      }

      const now = new Date();

      const updatedRentalRequest = await RentalRequest.findOneAndUpdate(
        {
          _id: rentalRequest._id,
          renter: req.user._id,
          status: "approved",
          paymentStatus: "unpaid",
          financialActionVersion: rentalRequest.financialActionVersion ?? 0
        },
        {
          $set: {
            status: "active",
            paymentStatus: "locked",
            lockedRent,
            lockedDeposit,
            totalLockedAmount,
            paymentConfirmedAt: now,
            actualStartDate: rentalRequest.actualStartDate || now,
            fundsLockedAt: now
          },
          $inc: {
            financialActionVersion: 1
          }
        },
        {
          new: true,
          session
        }
      );

      if (!updatedRentalRequest) {
        const error = new Error("This rental request has already been processed");
        error.statusCode = 400;
        throw error;
      }

      await getOrCreateWallet(rentalRequest.owner, { session });

      const lockResult = await lockFundsForRentalEscrow(
        {
          renterUserId: rentalRequest.renter,
          ownerUserId: rentalRequest.owner,
          amount: totalLockedAmount,
          referenceId: rentalRequest._id,
          renterDescription: "Rental payment for book",
          ownerDescription: "Funds locked for rental",
          renterMetadata: {
            source: "rental_start",
            rentalRequestId: rentalRequest._id,
            bookId: rentalRequest.book._id,
            bookTitle: rentalRequest.book.title || "",
            lockedRent,
            lockedDeposit
          },
          ownerMetadata: {
            source: "rental_start",
            rentalRequestId: rentalRequest._id,
            bookId: rentalRequest.book._id,
            bookTitle: rentalRequest.book.title || "",
            lockedRent,
            lockedDeposit
          }
        },
        { session }
      );

      await Book.findByIdAndUpdate(
        rentalRequest.book._id,
        {
          $set: { availabilityStatus: "rented" }
        },
        { session }
      );

      return {
        rentalRequestId: updatedRentalRequest._id,
        renterWallet: lockResult.renterWallet,
        ownerWallet: lockResult.ownerWallet
      };
    }
  );

  const updatedRentalRequest = await RentalRequest.findById(rentalRequestId)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("owner", "fullName name phoneNumber phone");

  const responsePayload = await attachChatMetadataToRequest(
    formatRentalRequestRenterActionResponse(updatedRentalRequest),
    updatedRentalRequest
  );

  res.status(200).json({
    message: "Rental started successfully and funds locked in escrow",
    rentalRequest: responsePayload,
    wallet: {
      renter: formatWalletSummary(renterWallet),
      owner: formatWalletSummary(ownerWallet)
    }
  });
});

const initiateRentalReturn = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await getRentalRequestForRenterAction(req.params.id, req.user._id);

  if (rentalRequest.status === "return_pending") {
    const error = new Error("Return has already been initiated for this rental request");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.status !== "active") {
    const error = new Error("Only active rental requests can be returned");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.paymentStatus !== "locked") {
    const error = new Error("Only rentals with locked funds can initiate return");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.settlementStatus !== "pending") {
    const error = new Error("This rental request is not eligible for return initiation");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.book.listingType === "sell") {
    const error = new Error("Sell requests do not support return actions");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "return_pending";
  await rentalRequest.save();

  createNotification({
    userId: rentalRequest.owner._id,
    type: "rental_return_initiated",
    message: "Renter requested to return the book",
    relatedId: rentalRequest._id
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("owner", "fullName name phoneNumber phone");

  const responsePayload = await attachChatMetadataToRequest(
    formatRentalRequestRenterActionResponse(updatedRentalRequest),
    updatedRentalRequest
  );

  res.status(200).json({
    message: "Return initiated successfully",
    rentalRequest: responsePayload
  });
});

const confirmRentalReturn = asyncHandler(async (req, res) => {
  validateRequest(req);

  const { rentalRequestId, renterId } = await runWalletOperationInTransaction(async (session) => {
    const rentalRequest = await RentalRequest.findById(req.params.id)
      .populate("book", "listingType title")
      .session(session);

    if (!rentalRequest) {
      const error = new Error("Rental request not found");
      error.statusCode = 404;
      throw error;
    }

    if (rentalRequest.owner.toString() !== req.user._id.toString()) {
      const error = new Error("You are not authorized to update this rental request");
      error.statusCode = 403;
      throw error;
    }

    if (rentalRequest.status === "completed") {
      const error = new Error("This rental request has already been completed");
      error.statusCode = 400;
      throw error;
    }

    if (rentalRequest.status !== "return_pending") {
      const error = new Error("Only return pending rental requests can be confirmed");
      error.statusCode = 400;
      throw error;
    }

    if (rentalRequest.paymentStatus !== "locked") {
      const error = new Error("Only rentals with locked funds can be settled");
      error.statusCode = 400;
      throw error;
    }

    if (rentalRequest.settlementStatus !== "pending") {
      const error = new Error("This rental request has already been settled");
      error.statusCode = 400;
      throw error;
    }

    if (rentalRequest.book.listingType === "sell") {
      const error = new Error("Sell requests do not support return actions");
      error.statusCode = 400;
      throw error;
    }

    const lockedRent = typeof rentalRequest.lockedRent === "number" ? rentalRequest.lockedRent : 0;
    const lockedDeposit =
      typeof rentalRequest.lockedDeposit === "number" ? rentalRequest.lockedDeposit : 0;
    const totalLockedAmount =
      typeof rentalRequest.totalLockedAmount === "number" ? rentalRequest.totalLockedAmount : 0;

    const now = new Date();

    const updatedRentalRequest = await RentalRequest.findOneAndUpdate(
      {
        _id: rentalRequest._id,
        owner: req.user._id,
        status: "return_pending",
        paymentStatus: "locked",
        settlementStatus: "pending"
      },
      {
        $set: {
          status: "completed",
          paymentStatus: "settled",
          settlementStatus: "completed",
          settledAt: now,
          actualReturnDate: rentalRequest.actualReturnDate || now,
          depositRefundedAt: now,
          rentReleasedAt: now,
          lockedRent: 0,
          lockedDeposit: 0,
          totalLockedAmount: 0
        },
        $inc: {
          financialActionVersion: 1
        }
      },
      {
        new: true,
        session
      }
    );

    if (!updatedRentalRequest) {
      const error = new Error("This rental request has already been settled");
      error.statusCode = 400;
      throw error;
    }

    await settleLockedRentalFunds(
      {
        renterUserId: rentalRequest.renter,
        ownerUserId: rentalRequest.owner,
        lockedRent,
        lockedDeposit,
        totalLockedAmount,
        referenceId: rentalRequest._id,
        bookTitle: rentalRequest.book?.title || ""
      },
      { session }
    );

    await Book.findByIdAndUpdate(
      rentalRequest.book._id || rentalRequest.book,
      {
        $set: { availabilityStatus: "available" }
      },
      { session }
    );

    return {
      rentalRequestId: updatedRentalRequest._id,
      renterId: rentalRequest.renter
    };
  });

  createNotification({
    userId: renterId,
    type: "rental_return_confirmed",
    message: "Return confirmed. Book completed",
    relatedId: rentalRequestId
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequestId)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("renter", "name phoneNumber phone");

  await closeChatThreadForRequest(updatedRentalRequest._id);

  res.status(200).json({
    message: "Return confirmed successfully",
    rentalRequest: formatRentalRequestActionResponse(updatedRentalRequest)
  });
});

const getIncomingRentalRequests = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const filters = {
    owner: req.user._id
  };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [requests, totalRequests] = await Promise.all([
    RentalRequest.find(filters)
      .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
      .populate("renter", "name phoneNumber phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRequests / limit));
  const responsePayload = await attachCurrentUserReviewsToRequests(
    await attachChatMetadataToRequests(
    requests.map(formatIncomingRentalRequestListItem),
    requests
    ),
    req.user._id
  );

  res.status(200).json({
    requests: responsePayload,
    totalRequests,
    currentPage: page,
    totalPages
  });
});

const getOutgoingRentalRequests = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const filters = {
    renter: req.user._id
  };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [requests, totalRequests] = await Promise.all([
    RentalRequest.find(filters)
      .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
      .populate("owner", "fullName name phoneNumber phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRequests / limit));
  const responsePayload = await attachCurrentUserReviewsToRequests(
    await attachChatMetadataToRequests(
    requests.map(formatOutgoingRentalRequestListItem),
    requests
    ),
    req.user._id
  );

  res.status(200).json({
    requests: responsePayload,
    totalRequests,
    currentPage: page,
    totalPages
  });
});

const getOwnerActiveRentalRequests = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const filters = {
    owner: req.user._id,
    status: { $in: ownerActiveRentalStatuses }
  };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [requests, totalRequests] = await Promise.all([
    RentalRequest.find(filters)
      .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
      .populate("renter", "name phoneNumber phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  const responsePayload = await attachChatMetadataToRequests(
    requests.map(formatOwnerActiveRentalResponse),
    requests
  );

  res.status(200).json({
    requests: responsePayload,
    ...buildRentalRequestListMeta(page, limit, totalRequests)
  });
});

const getRenterActiveRentalRequests = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const filters = {
    renter: req.user._id,
    status: { $in: renterActiveRentalStatuses }
  };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [requests, totalRequests] = await Promise.all([
    RentalRequest.find(filters)
      .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
      .populate("owner", "fullName name phoneNumber phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  const responsePayload = await attachChatMetadataToRequests(
    requests.map(formatRenterActiveRentalResponse),
    requests
  );

  res.status(200).json({
    requests: responsePayload,
    ...buildRentalRequestListMeta(page, limit, totalRequests)
  });
});

const getOwnRentalRequestForBook = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await RentalRequest.findOne({
    book: req.params.bookId,
    renter: req.user._id,
    status: { $in: ["pending", "approved", "active", "return_pending", "rejected", "completed", "cancelled", "expired"] }
  })
    .populate("book", "title")
    .populate("owner", "fullName name phoneNumber phone")
    .sort({ createdAt: -1 });

  const responsePayload = rentalRequest
    ? await attachChatMetadataToRequest(
        formatOwnBookRentalRequestResponse(rentalRequest),
        rentalRequest
      )
    : null;

  res.status(200).json({
    rentalRequest: responsePayload
  });
});

const createRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.body.book).populate("owner", "fullName name phoneNumber phone");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  if (book.availabilityStatus !== "available") {
    const error = new Error("Book is not available for requests");
    error.statusCode = 400;
    throw error;
  }

  if (book.owner._id.toString() === req.user._id.toString()) {
    const error = new Error("You cannot request your own book");
    error.statusCode = 400;
    throw error;
  }

  const existingRequest = await RentalRequest.findOne({
    book: book._id,
    renter: req.user._id,
    status: { $in: ACTIVE_REQUEST_STATUSES }
  });

  if (existingRequest) {
    const error = new Error("You already have an active rental request for this book");
    error.statusCode = 409;
    throw error;
  }

  const pricingSnapshot = calculateRentalPricing({
    weeklyRent: book.listingType === "sell" ? 0 : book.rentalPrice || 0,
    startDate: req.body.startDate,
    endDate: req.body.endDate
  });

  const rentalRequest = await RentalRequest.create({
    book: book._id,
    owner: book.owner._id,
    renter: req.user._id,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    weeklyRentSnapshot: pricingSnapshot.weeklyRent,
    perDayRentSnapshot: pricingSnapshot.perDayRent,
    rentalDays: pricingSnapshot.rentalDays,
    totalRent: pricingSnapshot.totalRent
  });

  createNotification({
    userId: book.owner._id,
    type: "rental_request_created",
    message: "New request received for your book",
    relatedId: rentalRequest._id
  });

  const populatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("owner", "fullName name phoneNumber phone")
    .populate("renter", "name");

  res.status(201).json({
    message: "Rental request created successfully",
    rentalRequest: await attachChatMetadataToRequest(
      formatRentalRequestResponse(populatedRentalRequest),
      populatedRentalRequest
    )
  });
});

module.exports = {
  createRentalRequest,
  getIncomingRentalRequests,
  getOutgoingRentalRequests,
  getOwnRentalRequestForBook,
  getOwnerActiveRentalRequests,
  getRenterActiveRentalRequests,
  approveRentalRequest,
  rejectRentalRequest,
  cancelRentalRequest,
  ownerCancelRentalRequest,
  expireStaleRentalRequests,
  startRentalRequest,
  initiateRentalReturn,
  confirmRentalReturn
};
