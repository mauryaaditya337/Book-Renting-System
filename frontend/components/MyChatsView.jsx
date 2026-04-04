"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatChatDateTime } from "@/lib/chats";

const THREAD_POLL_INTERVAL_MS = 10000;

export function MyChatsView() {
  const { token } = useAuth();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadThreads() {
      if (!token) {
        return;
      }

      try {
        const data = await apiRequest("/chats", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isActive) {
          setThreads(data.threads || []);
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

    loadThreads();
    const intervalId = window.setInterval(loadThreads, THREAD_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [token]);

  return (
    <ProtectedPage>
      <section className="space-y-5 md:space-y-6">
        <div className="ui-surface p-5 sm:p-6 lg:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700">
            My Chats
          </p>
          <h1 className="mt-2 text-[1.85rem] font-semibold text-slate-900 sm:text-[2.25rem]">
            Approved request conversations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Chat is available only for approved, active, and return coordination flows.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-3.5 md:gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="ui-card p-5">
                <div className="ui-skeleton h-24 rounded-3xl" />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="ui-feedback-error ui-feedback-panel">
            <h2 className="ui-feedback-title">Unable to load chats</h2>
            <p className="ui-feedback-body">{errorMessage}</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="request-empty-state">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="request-empty-main">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                  My Chats
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  No open chats yet
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                  Once a request is approved or becomes active, its chat thread will show up here.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/my-requests" className="ui-btn-primary">
                    View my requests
                  </Link>
                  <Link href="/incoming-requests" className="ui-btn-secondary">
                    Review incoming requests
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5 md:gap-4">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/chats/${thread.id}`}
                className="ui-card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
                      {(thread.requestStatus || "chat").replaceAll("_", " ")}
                    </p>
                    <h2 className="mt-2 truncate text-xl font-semibold text-slate-900">
                      {thread.book?.title || "Untitled book"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      With {thread.otherParticipant?.fullName || thread.otherParticipant?.name || "Unknown user"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatChatDateTime(thread.latestMessage?.createdAt || thread.updatedAt)}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Latest message
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {thread.latestMessage?.message || "No messages yet. Open chat to start coordinating."}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </ProtectedPage>
  );
}
