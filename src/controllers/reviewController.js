const RentalRequest = require("../models/RentalRequest");
const Review = require("../models/Review");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");
const { formatReviewResponse, getReviewSummaryForUser } = require("../services/reviewService");

function normalizeId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
}

function resolveReviewParticipants(rentalRequest, reviewerId) {
  const ownerId = normalizeId(rentalRequest.owner);
  const renterId = normalizeId(rentalRequest.renter);
  const reviewerIdString = normalizeId(reviewerId);

  if (reviewerIdString === ownerId) {
    return {
      revieweeId: renterId,
      role: "owner_to_requester"
    };
  }

  if (reviewerIdString === renterId) {
    return {
      revieweeId: ownerId,
      role: "requester_to_owner"
    };
  }

  return null;
}

const createReview = asyncHandler(async (req, res) => {
  validateRequest(req);

  const rentalRequest = await RentalRequest.findById(req.body.requestId)
    .populate("book", "title")
    .populate("owner", "fullName name")
    .populate("renter", "fullName name");

  if (!rentalRequest) {
    const error = new Error("Rental request not found");
    error.statusCode = 404;
    throw error;
  }

  if (rentalRequest.status !== "completed") {
    const error = new Error("Reviews can only be submitted for completed requests");
    error.statusCode = 400;
    throw error;
  }

  const participantReview = resolveReviewParticipants(rentalRequest, req.user._id);

  if (!participantReview) {
    const error = new Error("Only request participants can review each other");
    error.statusCode = 403;
    throw error;
  }

  const existingReview = await Review.findOne({
    requestId: rentalRequest._id,
    reviewerId: req.user._id
  });

  if (existingReview) {
    const error = new Error("You have already submitted a review for this request");
    error.statusCode = 409;
    throw error;
  }

  try {
    const review = await Review.create({
      requestId: rentalRequest._id,
      reviewerId: req.user._id,
      revieweeId: participantReview.revieweeId,
      bookId: rentalRequest.book?._id || rentalRequest.book || null,
      rating: req.body.rating,
      comment: req.body.comment || "",
      role: participantReview.role
    });

    const populatedReview = await Review.findById(review._id)
      .populate("reviewerId", "fullName name")
      .populate("bookId", "title");

    res.status(201).json({
      message: "Review submitted successfully",
      review: formatReviewResponse(populatedReview)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateError = new Error("You have already submitted a review for this request");
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
});

const getReviewsForUser = asyncHandler(async (req, res) => {
  validateRequest(req);

  const [reviews, summary] = await Promise.all([
    Review.find({
      revieweeId: req.params.userId
    })
      .populate("reviewerId", "fullName name")
      .populate("bookId", "title")
      .sort({ createdAt: -1 }),
    getReviewSummaryForUser(req.params.userId)
  ]);

  res.status(200).json({
    reviews: reviews.map(formatReviewResponse),
    averageRating: summary.averageRating,
    totalReviews: summary.totalReviews
  });
});

module.exports = {
  createReview,
  getReviewsForUser
};
