const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalRequest",
      required: [true, "Request is required"]
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer is required"]
    },
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewee is required"]
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"]
    },
    comment: {
      type: String,
      trim: true,
      default: ""
    },
    role: {
      type: String,
      enum: ["owner_to_requester", "requester_to_owner"],
      required: [true, "Review role is required"]
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ requestId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ revieweeId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
