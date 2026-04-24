const mongoose = require("mongoose");
const Review = require("../models/Review");

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(String(value));
}

function roundAverageRating(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}

function formatReviewResponse(review) {
  if (!review) {
    return null;
  }

  return {
    id: review._id,
    requestId: review.requestId?._id || review.requestId || "",
    reviewer: review.reviewerId
      ? {
          id: review.reviewerId._id || review.reviewerId,
          name: review.reviewerId.fullName || review.reviewerId.name || "Unknown user"
        }
      : null,
    revieweeId: review.revieweeId?._id || review.revieweeId || "",
    book: review.bookId
      ? {
          id: review.bookId._id || review.bookId,
          title: review.bookId.title || ""
        }
      : null,
    rating: review.rating,
    comment: review.comment || "",
    role: review.role,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

async function getReviewSummaryForUser(userId) {
  const normalizedUserId = toObjectId(userId);

  if (!normalizedUserId) {
    return {
      averageRating: 0,
      totalReviews: 0
    };
  }

  const [summary] = await Review.aggregate([
    {
      $match: {
        revieweeId: normalizedUserId
      }
    },
    {
      $group: {
        _id: "$revieweeId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  return {
    averageRating: roundAverageRating(summary?.averageRating || 0),
    totalReviews: summary?.totalReviews || 0
  };
}

async function getReviewSummariesForUsers(userIds = []) {
  const uniqueUserIds = [
    ...new Set(
      userIds
        .map((userId) => toObjectId(userId))
        .filter(Boolean)
        .map((userId) => String(userId))
    )
  ].map((userId) => new mongoose.Types.ObjectId(userId));

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const summaries = await Review.aggregate([
    {
      $match: {
        revieweeId: {
          $in: uniqueUserIds
        }
      }
    },
    {
      $group: {
        _id: "$revieweeId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  return new Map(
    summaries.map((summary) => [
      String(summary._id),
      {
        averageRating: roundAverageRating(summary.averageRating || 0),
        totalReviews: summary.totalReviews || 0
      }
    ])
  );
}

async function attachCurrentUserReviewsToRequests(payloads = [], currentUserId) {
  if (!currentUserId || payloads.length === 0) {
    return payloads.map((payload) => ({
      ...payload,
      currentUserReview: null
    }));
  }

  const requestIds = payloads.map((payload) => payload.id).filter(Boolean);

  if (requestIds.length === 0) {
    return payloads.map((payload) => ({
      ...payload,
      currentUserReview: null
    }));
  }

  const reviews = await Review.find({
    requestId: { $in: requestIds },
    reviewerId: currentUserId
  })
    .populate("reviewerId", "fullName name")
    .populate("bookId", "title")
    .lean();

  const reviewsByRequestId = new Map(
    reviews.map((review) => [String(review.requestId), formatReviewResponse(review)])
  );

  return payloads.map((payload) => ({
    ...payload,
    currentUserReview: reviewsByRequestId.get(String(payload.id)) || null
  }));
}

module.exports = {
  attachCurrentUserReviewsToRequests,
  formatReviewResponse,
  getReviewSummaryForUser,
  getReviewSummariesForUsers,
  roundAverageRating
};
