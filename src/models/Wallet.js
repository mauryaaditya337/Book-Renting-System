const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      unique: true
    },
    generalBalance: {
      type: Number,
      default: 0,
      min: [0, "General balance must be at least 0"]
    },
    lockedBalance: {
      type: Number,
      default: 0,
      min: [0, "Locked balance must be at least 0"]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Wallet", walletSchema);
