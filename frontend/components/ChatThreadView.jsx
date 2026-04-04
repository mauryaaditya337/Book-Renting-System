"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatChatDateTime } from "@/lib/chats";

const MESSAGE_POLL_INTERVAL_MS = 5000;

export function ChatThreadView({ threadId }) {
  const { token, user } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadThread() {
      if (!token) {
        return;
      }

      try {
        const data = await apiRequest(`/chats/${threadId}/messages`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isActive) {
          setThread(data.thread || null);
          setMessages(data.messages || []);
          setErrorMessage("");
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadThread();
    const intervalId = window.setInterval(loadThread, MESSAGE_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [threadId, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token || !draftMessage.trim()) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const data = await apiRequest(`/chats/${threadId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: draftMessage
        })
      });

      setMessages((current) => [...current, data.chatMessage]);
      setDraftMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ProtectedPage>
      <section className="space-y-5 md:space-y-6">
        {isLoading ? (
          <div className="ui-surface p-6">
            <div className="ui-skeleton h-96 rounded-3xl" />
          </div>
        ) : errorMessage && !thread ? (
          <div className="ui-feedback-error ui-feedback-panel">
            <h2 className="ui-feedback-title">Unable to open chat</h2>
            <p className="ui-feedback-body">{errorMessage}</p>
          </div>
        ) : thread ? (
          <>
            <div className="ui-surface p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700">
                    Request Chat
                  </p>
                  <h1 className="mt-2 text-[1.85rem] font-semibold text-slate-900 sm:text-[2.25rem]">
                    {thread.book?.title || "Untitled book"}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Coordinating with {thread.otherParticipant?.fullName || thread.otherParticipant?.name || "Unknown user"}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/my-chats" className="ui-btn-secondary">
                    Back to chats
                  </Link>
                  {thread.book?.id ? (
                    <Link href={`/books/${thread.book.id}`} className="ui-btn-primary">
                      View book
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ui-card flex min-h-[28rem] flex-col overflow-hidden p-0">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <p className="text-sm font-semibold text-slate-900">Messages</p>
                <p className="mt-1 text-sm text-slate-600">
                  Polling refresh runs every 5 seconds while this page is open.
                </p>
              </div>

              <div className="flex-1 space-y-3 bg-slate-50/70 px-4 py-4 sm:px-5">
                {messages.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
                    No messages yet. Send the first message to coordinate the handoff.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage =
                      String(message.sender?.id || "") === String(user?.id || user?._id || "");

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[1.35rem] px-4 py-3 shadow-sm ${
                            isOwnMessage
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200/80 bg-white text-slate-800"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                            {isOwnMessage
                              ? "You"
                              : message.sender?.fullName || message.sender?.name || "Participant"}
                          </p>
                          <p className="mt-2 text-sm leading-6">{message.message}</p>
                          <p className="mt-2 text-xs opacity-70">
                            {formatChatDateTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSubmit} className="border-t border-slate-200/80 bg-white px-4 py-4 sm:px-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Message</span>
                  <textarea
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    rows={3}
                    placeholder="Type a message about pickup, handoff, or return coordination."
                    className="ui-textarea"
                  />
                </label>

                {errorMessage ? (
                  <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="submit"
                    disabled={isSending || !draftMessage.trim()}
                    className="ui-btn-primary"
                  >
                    {isSending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : null}
      </section>
    </ProtectedPage>
  );
}
