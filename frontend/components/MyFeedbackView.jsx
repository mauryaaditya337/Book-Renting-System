"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

const PAGE_LIMIT = 20;

function formatFeedbackDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toTitleCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFeedbackTone(type) {
  if (type === "bug") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (type === "suggestion") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-sky-50 text-sky-700 border-sky-200";
}

export function MyFeedbackView() {
  const { token } = useAuth();
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadFeedback() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/feedback/mine?page=1&limit=${PAGE_LIMIT}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isActive) {
          setFeedbackItems(data.feedback || []);
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

    loadFeedback();

    return () => {
      isActive = false;
    };
  }, [token]);

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                My Feedback
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Review the feedback you’ve submitted
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Keep track of your bug reports, suggestions, and general product feedback in one
                place.
              </p>
            </div>

            <Link
              href="/feedback"
              className="rounded-2xl bg-teal-700 px-5 py-3 text-center font-medium text-white transition hover:bg-teal-800"
            >
              Leave more feedback
            </Link>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : feedbackItems.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {feedbackItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                        Submitted {formatFeedbackDateTime(item.createdAt)}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        {toTitleCase(item.type)} feedback
                      </h2>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <InfoRow label="Status" value={toTitleCase(item.status)} />
                      <InfoRow label="Page" value={item.page || "Not captured"} />
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Message</p>
                      <p className="mt-2 whitespace-pre-wrap">{item.message}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getFeedbackTone(
                      item.type
                    )}`}
                  >
                    {toTitleCase(item.type)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </ProtectedPage>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">Unable to load feedback</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">No feedback submitted yet</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        When you send product feedback, it will appear here for easy reference.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/feedback"
          className="inline-flex rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
        >
          Leave feedback
        </Link>
        <Link
          href="/books"
          className="inline-flex rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Browse books
        </Link>
      </div>
    </div>
  );
}
