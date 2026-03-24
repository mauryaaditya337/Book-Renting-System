const BookRequest = require("../models/BookRequest");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequest = require("../utils/validateRequest");

const formatBookRequestResponse = (bookRequest) => ({
  id: bookRequest._id,
  requestedTitle: bookRequest.requestedTitle,
  authorOrSubject: bookRequest.authorOrSubject || "",
  semesterOrCourse: bookRequest.semesterOrCourse || "",
  collegeName: bookRequest.collegeName || "",
  note: bookRequest.note || "",
  status: bookRequest.status || "open",
  requestedBy: bookRequest.requestedBy
    ? {
        id: bookRequest.requestedBy._id || bookRequest.requestedBy,
        fullName: bookRequest.requestedBy.fullName || bookRequest.requestedBy.name || "",
        email: bookRequest.requestedBy.email || ""
      }
    : null,
  createdAt: bookRequest.createdAt,
  updatedAt: bookRequest.updatedAt
});

const createBookRequest = asyncHandler(async (req, res) => {
  validateRequest(req);

  const bookRequest = await BookRequest.create({
    requestedTitle: req.body.requestedTitle,
    authorOrSubject: req.body.authorOrSubject,
    semesterOrCourse: req.body.semesterOrCourse,
    collegeName: req.body.collegeName,
    note: req.body.note,
    requestedBy: req.user?._id || null
  });

  const populatedRequest = await BookRequest.findById(bookRequest._id).populate(
    "requestedBy",
    "fullName name email"
  );

  res.status(201).json({
    message: "Book request submitted successfully",
    bookRequest: formatBookRequestResponse(populatedRequest)
  });
});

const getOwnBookRequests = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const skip = (page - 1) * limit;

  const filters = {
    requestedBy: req.user._id
  };

  const [requests, totalRequests] = await Promise.all([
    BookRequest.find(filters)
      .populate("requestedBy", "fullName name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    BookRequest.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRequests / limit));

  res.status(200).json({
    requests: requests.map(formatBookRequestResponse),
    totalRequests,
    currentPage: page,
    totalPages
  });
});

module.exports = {
  createBookRequest,
  getOwnBookRequests
};
