const mongoose = require("mongoose");

const allowedTransactionTypes = ["credit", "debit", "lock", "unlock"];
const allowedTransactionStatuses = ["pending", "success", "failed"];

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true
    },
    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: allowedTransactionTypes,
        message: "Transaction type must be one of: credit, debit, lock, unlock"
      }
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"]
    },
    status: {
      type: String,
      enum: {
        values: allowedTransactionStatuses,
        message: "Status must be one of: pending, success, failed"
      },
      default: "success"
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
