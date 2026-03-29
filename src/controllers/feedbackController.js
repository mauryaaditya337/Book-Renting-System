const Feedback = require("../models/Feedback");
const asyncHandler = require("../middleware/asyncHandler");
const validateRequest = require("../utils/validateRequest");

const formatFeedbackResponse = (feedback) => ({
  id: feedback._id,
  type: feedback.type,
  message: feedback.message,
  page: feedback.page || "",
  status: feedback.status,
  userId: feedback.userId?._id || feedback.userId || null,
  createdAt: feedback.createdAt,
  updatedAt: feedback.updatedAt
});

const createFeedback = asyncHandler(async (req, res) => {
  validateRequest(req);

  const feedback = await Feedback.create({
    userId: req.user?._id || null,
    type: req.body.type || "general",
    message: req.body.message,
    page: req.body.page || ""
  });

  res.status(201).json({
    message: "Feedback submitted successfully",
    feedback: formatFeedbackResponse(feedback)
  });
});

const getMyFeedback = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const skip = (page - 1) * limit;

  const filters = {
    userId: req.user._id
  };

  const [feedbackItems, totalFeedback] = await Promise.all([
    Feedback.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Feedback.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalFeedback / limit));

  res.status(200).json({
    feedback: feedbackItems.map(formatFeedbackResponse),
    totalFeedback,
    currentPage: page,
    totalPages
  });
});

module.exports = {
  createFeedback,
  getMyFeedback
};
