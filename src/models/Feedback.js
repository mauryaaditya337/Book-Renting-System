const mongoose = require("mongoose");

const feedbackTypes = ["bug", "suggestion", "general"];
const feedbackStatuses = ["new", "reviewed"];

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    type: {
      type: String,
      enum: {
        values: feedbackTypes,
        message: "Type must be one of: bug, suggestion, general"
      },
      default: "general"
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true
    },
    page: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: {
        values: feedbackStatuses,
        message: "Status must be one of: new, reviewed"
      },
      default: "new"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
