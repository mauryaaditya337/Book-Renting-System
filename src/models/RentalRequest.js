const mongoose = require("mongoose");

const rentalRequestSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book is required"]
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"]
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Renter is required"]
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"]
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"]
    },
    weeklyRentSnapshot: {
      type: Number,
      default: 0,
      min: [0, "Weekly rent snapshot must be at least 0"]
    },
    perDayRentSnapshot: {
      type: Number,
      default: 0,
      min: [0, "Per-day rent snapshot must be at least 0"]
    },
    rentalDays: {
      type: Number,
      default: 0,
      min: [0, "Rental days must be at least 0"]
    },
    totalRent: {
      type: Number,
      default: 0,
      min: [0, "Total rent must be at least 0"]
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "locked", "settled", "refunded"],
      default: "unpaid"
    },
    lockedRent: {
      type: Number,
      default: 0,
      min: [0, "Locked rent must be at least 0"]
    },
    lockedDeposit: {
      type: Number,
      default: 0,
      min: [0, "Locked deposit must be at least 0"]
    },
    totalLockedAmount: {
      type: Number,
      default: 0,
      min: [0, "Total locked amount must be at least 0"]
    },
    paymentConfirmedAt: {
      type: Date,
      default: null
    },
    actualStartDate: {
      type: Date,
      default: null
    },
    fundsLockedAt: {
      type: Date,
      default: null
    },
    settlementStatus: {
      type: String,
      enum: ["pending", "completed", "refunded"],
      default: "pending"
    },
    settledAt: {
      type: Date,
      default: null
    },
    actualReturnDate: {
      type: Date,
      default: null
    },
    depositRefundedAt: {
      type: Date,
      default: null
    },
    rentReleasedAt: {
      type: Date,
      default: null
    },
    financialActionVersion: {
      type: Number,
      default: 0,
      min: [0, "Financial action version must be at least 0"]
    },
    paymentReference: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "approved", "active", "return_pending", "completed", "rejected"],
      default: "pending"
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("RentalRequest", rentalRequestSchema);
