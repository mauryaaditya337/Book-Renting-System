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
