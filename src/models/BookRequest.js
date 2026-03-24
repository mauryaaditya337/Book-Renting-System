const mongoose = require("mongoose");

const allowedBookRequestStatuses = ["open", "fulfilled", "closed"];

const bookRequestSchema = new mongoose.Schema(
  {
    requestedTitle: {
      type: String,
      required: [true, "Requested title is required"],
      trim: true
    },
    authorOrSubject: {
      type: String,
      trim: true,
      default: ""
    },
    semesterOrCourse: {
      type: String,
      trim: true,
      default: ""
    },
    collegeName: {
      type: String,
      trim: true,
      default: ""
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    status: {
      type: String,
      enum: {
        values: allowedBookRequestStatuses,
        message: "Status must be one of: open, fulfilled, closed"
      },
      default: "open"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("BookRequest", bookRequestSchema);
