const mongoose = require("mongoose");

const allowedWalletRequestStatuses = ["pending", "approved", "rejected"];

const walletRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"]
    },
    status: {
      type: String,
      enum: {
        values: allowedWalletRequestStatuses,
        message: "Status must be one of: pending, approved, rejected"
      },
      default: "pending"
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    adminNote: {
      type: String,
      trim: true,
      default: ""
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("WalletRequest", walletRequestSchema);
