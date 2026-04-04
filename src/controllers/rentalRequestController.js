const Book = require("../models/Book");
const ChatThread = require("../models/ChatThread");
const RentalRequest = require("../models/RentalRequest");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");
const createNotification = require("../utils/createNotification");
const { calculateRentalPricing } = require("../utils/rentalPricing");

const CHAT_ENABLED_REQUEST_STATUSES = ["approved", "active", "return_pending"];

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

  const rentalRequest = await getRentalRequestForRenterAction(req.params.id, req.user._id);

  if (rentalRequest.status === "active") {
    const error = new Error("This rental request has already been started");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.status === "completed") {
    const error = new Error("This rental request has already been completed");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.status !== "approved") {
    const error = new Error("Only approved rental requests can be started");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.book.listingType === "sell") {
    const error = new Error("Sell requests do not support rental actions");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "active";
  await rentalRequest.save();

  await Book.findByIdAndUpdate(rentalRequest.book._id, {
    $set: { availabilityStatus: "rented" }
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category listingType rentalPrice salePrice securityDeposit")
    .populate("owner", "fullName name phoneNumber phone");

  const responsePayload = await attachChatMetadataToRequest(
    formatRentalRequestRenterActionResponse(updatedRentalRequest),
    updatedRentalRequest
  );

  res.status(200).json({
    message: "Rental started successfully",
    rentalRequest: responsePayload
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

  const rentalRequest = await getRentalRequestForOwnerAction(req.params.id, req.user._id);

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

  if (rentalRequest.book.listingType === "sell") {
    const error = new Error("Sell requests do not support return actions");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "completed";
  await rentalRequest.save();

  await Book.findByIdAndUpdate(rentalRequest.book._id, {
    $set: { availabilityStatus: "available" }
  });

  createNotification({
    userId: rentalRequest.renter._id,
    type: "rental_return_confirmed",
    message: "Return confirmed. Book completed",
    relatedId: rentalRequest._id
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
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
  const responsePayload = await attachChatMetadataToRequests(
    requests.map(formatIncomingRentalRequestListItem),
    requests
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
  const responsePayload = await attachChatMetadataToRequests(
    requests.map(formatOutgoingRentalRequestListItem),
    requests
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
    status: { $in: ["pending", "approved", "active", "return_pending", "rejected", "completed"] }
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
    status: { $in: ["pending", "approved", "active", "return_pending"] }
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
  startRentalRequest,
  initiateRentalReturn,
  confirmRentalReturn
};
