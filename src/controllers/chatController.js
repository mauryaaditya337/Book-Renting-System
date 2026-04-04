const ChatMessage = require("../models/ChatMessage");
const ChatThread = require("../models/ChatThread");
const validateRequest = require("../utils/validateRequest");
const createNotification = require("../utils/createNotification");
const asyncHandler = require("../middleware/asyncHandler");

const CHAT_ENABLED_REQUEST_STATUSES = ["approved", "active", "return_pending"];

function canUseChatForStatus(status) {
  return CHAT_ENABLED_REQUEST_STATUSES.includes(status);
}

function isParticipant(thread, userId) {
  const normalizedUserId = String(userId);

  return (
    String(thread.ownerId?._id || thread.ownerId) === normalizedUserId ||
    String(thread.requesterId?._id || thread.requesterId) === normalizedUserId
  );
}

function toParticipantSummary(user) {
  if (!user) {
    return {
      id: "",
      name: "Unknown user",
      fullName: ""
    };
  }

  return {
    id: user._id,
    name: user.name || user.fullName || "Unknown user",
    fullName: user.fullName || user.name || ""
  };
}

function buildChatNotificationMessage(senderName, messageText) {
  const preview = String(messageText || "").trim().replace(/\s+/g, " ");

  if (!preview) {
    return `New message from ${senderName}`;
  }

  const truncatedPreview = preview.length > 72 ? `${preview.slice(0, 69)}...` : preview;
  return `${senderName}: ${truncatedPreview}`;
}

async function getAuthorizedChatThread(threadId, userId) {
  const thread = await ChatThread.findById(threadId)
    .populate("requestId", "status")
    .populate("bookId", "title author")
    .populate("ownerId", "name fullName")
    .populate("requesterId", "name fullName");

  if (!thread) {
    const error = new Error("Chat thread not found");
    error.statusCode = 404;
    throw error;
  }

  if (!isParticipant(thread, userId)) {
    const error = new Error("You are not authorized to access this chat thread");
    error.statusCode = 403;
    throw error;
  }

  if (!thread.isOpen || !canUseChatForStatus(thread.requestId?.status)) {
    const error = new Error("Chat is not available for this request");
    error.statusCode = 403;
    throw error;
  }

  return thread;
}

const getChatThreads = asyncHandler(async (req, res) => {
  const threads = await ChatThread.find({
    $or: [{ ownerId: req.user._id }, { requesterId: req.user._id }]
  })
    .populate("requestId", "status")
    .populate("bookId", "title author")
    .populate("ownerId", "name fullName")
    .populate("requesterId", "name fullName")
    .sort({ updatedAt: -1 });

  const openThreads = threads.filter(
    (thread) => thread.isOpen && canUseChatForStatus(thread.requestId?.status)
  );

  const latestMessages = await Promise.all(
    openThreads.map((thread) =>
      ChatMessage.findOne({ threadId: thread._id })
        .sort({ createdAt: -1 })
        .populate("senderId", "name fullName")
    )
  );

  res.status(200).json({
    threads: openThreads.map((thread, index) => {
      const latestMessage = latestMessages[index];
      const isOwner = String(thread.ownerId?._id || thread.ownerId) === String(req.user._id);
      const otherParticipant = isOwner ? thread.requesterId : thread.ownerId;

      return {
        id: thread._id,
        requestId: thread.requestId?._id || "",
        requestStatus: thread.requestId?.status || "",
        isOpen: thread.isOpen,
        book: {
          id: thread.bookId?._id || "",
          title: thread.bookId?.title || "Untitled book",
          author: thread.bookId?.author || ""
        },
        otherParticipant: toParticipantSummary(otherParticipant),
        latestMessage: latestMessage
          ? {
              id: latestMessage._id,
              senderId: latestMessage.senderId?._id || "",
              senderName:
                latestMessage.senderId?.fullName || latestMessage.senderId?.name || "Unknown user",
              message: latestMessage.message,
              createdAt: latestMessage.createdAt
            }
          : null,
        updatedAt: thread.updatedAt,
        createdAt: thread.createdAt
      };
    })
  });
});

const getChatMessages = asyncHandler(async (req, res) => {
  validateRequest(req);

  const thread = await getAuthorizedChatThread(req.params.threadId, req.user._id);
  const messages = await ChatMessage.find({ threadId: thread._id })
    .sort({ createdAt: 1 })
    .populate("senderId", "name fullName");
  const isOwner = String(thread.ownerId?._id || thread.ownerId) === String(req.user._id);

  res.status(200).json({
    thread: {
      id: thread._id,
      requestId: thread.requestId?._id || "",
      requestStatus: thread.requestId?.status || "",
      book: {
        id: thread.bookId?._id || "",
        title: thread.bookId?.title || "Untitled book",
        author: thread.bookId?.author || ""
      },
      owner: toParticipantSummary(thread.ownerId),
      requester: toParticipantSummary(thread.requesterId),
      otherParticipant: toParticipantSummary(isOwner ? thread.requesterId : thread.ownerId),
      isOpen: thread.isOpen,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt
    },
    messages: messages.map((message) => ({
      id: message._id,
      threadId: message.threadId,
      sender: {
        id: message.senderId?._id || "",
        name: message.senderId?.name || message.senderId?.fullName || "Unknown user",
        fullName: message.senderId?.fullName || message.senderId?.name || ""
      },
      message: message.message,
      createdAt: message.createdAt
    }))
  });
});

const sendChatMessage = asyncHandler(async (req, res) => {
  validateRequest(req);

  const thread = await getAuthorizedChatThread(req.params.threadId, req.user._id);
  const messageText = String(req.body.message || "").trim();

  if (!messageText) {
    const error = new Error("Message cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  const chatMessage = await ChatMessage.create({
    threadId: thread._id,
    senderId: req.user._id,
    message: messageText
  });

  await ChatThread.findByIdAndUpdate(thread._id, {
    $set: { isOpen: true }
  });

  const senderName = req.user.fullName || req.user.name || "Someone";
  const receiverId =
    String(thread.ownerId?._id || thread.ownerId) === String(req.user._id)
      ? thread.requesterId?._id || thread.requesterId
      : thread.ownerId?._id || thread.ownerId;

  if (receiverId && String(receiverId) !== String(req.user._id)) {
    createNotification({
      userId: receiverId,
      type: "chat_message",
      message: buildChatNotificationMessage(senderName, messageText),
      relatedId: thread._id
    });
  }

  const populatedMessage = await ChatMessage.findById(chatMessage._id).populate(
    "senderId",
    "name fullName"
  );

  res.status(201).json({
    message: "Message sent successfully",
    chatMessage: {
      id: populatedMessage._id,
      threadId: populatedMessage.threadId,
      sender: {
        id: populatedMessage.senderId?._id || "",
        name: populatedMessage.senderId?.name || populatedMessage.senderId?.fullName || "Unknown user",
        fullName: populatedMessage.senderId?.fullName || populatedMessage.senderId?.name || ""
      },
      message: populatedMessage.message,
      createdAt: populatedMessage.createdAt
    }
  });
});

module.exports = {
  CHAT_ENABLED_REQUEST_STATUSES,
  canUseChatForStatus,
  getChatThreads,
  getChatMessages,
  sendChatMessage
};
