export const CHAT_ENABLED_REQUEST_STATUSES = ["approved", "active", "return_pending"];

export function canOpenChat(request) {
  return Boolean(
    request &&
      request.chat?.isAvailable &&
      request.chat?.threadId &&
      CHAT_ENABLED_REQUEST_STATUSES.includes(request.status)
  );
}

export function getChatHref(request) {
  return canOpenChat(request) ? `/chats/${request.chat.threadId}` : "";
}

export function formatChatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
