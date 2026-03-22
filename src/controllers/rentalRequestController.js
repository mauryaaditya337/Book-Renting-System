const Book = require("../models/Book");
const RentalRequest = require("../models/RentalRequest");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");

const normalizeDate = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatRentalRequestResponse = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  owner: {
    id: rentalRequest.owner._id,
    name: rentalRequest.owner.name,
    email: rentalRequest.owner.email
  },
  renter: {
    id: rentalRequest.renter._id,
    name: rentalRequest.renter.name,
    email: rentalRequest.renter.email
  },
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt
});

const formatRentalRequestActionResponse = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  renter: {
    id: rentalRequest.renter._id,
    name: rentalRequest.renter.name,
    email: rentalRequest.renter.email
  },
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt
});

const formatReturnInitiationResponse = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  owner: {
    id: rentalRequest.owner._id,
    name: rentalRequest.owner.name,
    email: rentalRequest.owner.email
  },
  createdAt: rentalRequest.createdAt,
  updatedAt: rentalRequest.updatedAt
});

const formatOwnerActiveRentalResponse = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  renter: {
    id: rentalRequest.renter._id,
    name: rentalRequest.renter.name,
    email: rentalRequest.renter.email
  }
});

const formatRenterActiveRentalResponse = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  owner: {
    id: rentalRequest.owner._id,
    name: rentalRequest.owner.name,
    email: rentalRequest.owner.email
  }
});

const formatIncomingRentalRequestListItem = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  renter: {
    id: rentalRequest.renter._id,
    name: rentalRequest.renter.name,
    email: rentalRequest.renter.email
  }
});

const formatOutgoingRentalRequestListItem = (rentalRequest) => ({
  id: rentalRequest._id,
  status: rentalRequest.status,
  startDate: rentalRequest.startDate,
  endDate: rentalRequest.endDate,
  createdAt: rentalRequest.createdAt,
  book: {
    id: rentalRequest.book._id,
    title: rentalRequest.book.title,
    author: rentalRequest.book.author,
    category: rentalRequest.book.category,
    rentalPrice: rentalRequest.book.rentalPrice,
    securityDeposit: rentalRequest.book.securityDeposit
  },
  owner: {
    id: rentalRequest.owner._id,
    name: rentalRequest.owner.name,
    email: rentalRequest.owner.email
  }
});

const buildRentalRequestListMeta = (page, limit, totalRequests) => ({
  totalRequests,
  currentPage: page,
  totalPages: Math.max(1, Math.ceil(totalRequests / limit))
});

const ownerActiveRentalStatuses = ["approved", "return_pending"];

const getRentalRequestForOwnerAction = async (requestId, userId) => {
  const rentalRequest = await RentalRequest.findById(requestId)
    .populate("book", "title author category rentalPrice securityDeposit owner")
    .populate("renter", "name email");

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
    .populate("book", "title author category rentalPrice securityDeposit")
    .populate("owner", "name email");

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
    $set: { availabilityStatus: "rented" }
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category rentalPrice securityDeposit")
    .populate("renter", "name email");

  res.status(200).json({
    message: "Rental request approved successfully",
    rentalRequest: formatRentalRequestActionResponse(updatedRentalRequest)
  });
});

const rejectRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await getRentalRequestForOwnerAction(req.params.id, req.user._id);

  if (rentalRequest.status !== "pending") {
    const error = new Error("Only pending rental requests can be rejected");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "rejected";
  await rentalRequest.save();

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category rentalPrice securityDeposit")
    .populate("renter", "name email");

  res.status(200).json({
    message: "Rental request rejected successfully",
    rentalRequest: formatRentalRequestActionResponse(updatedRentalRequest)
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

  if (rentalRequest.status === "completed") {
    const error = new Error("This rental request has already been completed");
    error.statusCode = 400;
    throw error;
  }

  if (rentalRequest.status !== "approved") {
    const error = new Error("Only active approved rental requests can be returned");
    error.statusCode = 400;
    throw error;
  }

  rentalRequest.status = "return_pending";
  await rentalRequest.save();

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category rentalPrice securityDeposit")
    .populate("owner", "name email");

  res.status(200).json({
    message: "Return initiated successfully",
    rentalRequest: formatReturnInitiationResponse(updatedRentalRequest)
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

  rentalRequest.status = "completed";
  await rentalRequest.save();

  await Book.findByIdAndUpdate(rentalRequest.book._id, {
    $set: { availabilityStatus: "available" }
  });

  const updatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category rentalPrice securityDeposit")
    .populate("renter", "name email");

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
      .populate("book", "title author category rentalPrice securityDeposit")
      .populate("renter", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRequests / limit));

  res.status(200).json({
    requests: requests.map(formatIncomingRentalRequestListItem),
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
      .populate("book", "title author category rentalPrice securityDeposit")
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRequests / limit));

  res.status(200).json({
    requests: requests.map(formatOutgoingRentalRequestListItem),
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
      .populate("book", "title author category rentalPrice securityDeposit")
      .populate("renter", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  res.status(200).json({
    requests: requests.map(formatOwnerActiveRentalResponse),
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
    status: "approved"
  };

  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [requests, totalRequests] = await Promise.all([
    RentalRequest.find(filters)
      .populate("book", "title author category rentalPrice securityDeposit")
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RentalRequest.countDocuments(filters)
  ]);

  res.status(200).json({
    requests: requests.map(formatRenterActiveRentalResponse),
    ...buildRentalRequestListMeta(page, limit, totalRequests)
  });
});

const createRentalRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.body.book).populate("owner", "name email");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  if (book.availabilityStatus !== "available") {
    const error = new Error("Book is not available for rent");
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
    status: { $in: ["pending", "approved"] }
  });

  if (existingRequest) {
    const error = new Error("You already have an active rental request for this book");
    error.statusCode = 409;
    throw error;
  }

  const rentalRequest = await RentalRequest.create({
    book: book._id,
    owner: book.owner._id,
    renter: req.user._id,
    startDate: req.body.startDate,
    endDate: req.body.endDate
  });

  const populatedRentalRequest = await RentalRequest.findById(rentalRequest._id)
    .populate("book", "title author category rentalPrice securityDeposit")
    .populate("owner", "name email")
    .populate("renter", "name email");

  res.status(201).json({
    message: "Rental request created successfully",
    rentalRequest: formatRentalRequestResponse(populatedRentalRequest)
  });
});

module.exports = {
  createRentalRequest,
  getIncomingRentalRequests,
  getOutgoingRentalRequests,
  getOwnerActiveRentalRequests,
  getRenterActiveRentalRequests,
  approveRentalRequest,
  rejectRentalRequest,
  initiateRentalReturn,
  confirmRentalReturn
};
