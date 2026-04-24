"use client";

import { useEffect, useState } from "react";

export function ReviewModal({
  isOpen,
  revieweeName,
  isSubmitting,
  errorMessage,
  successMessage,
  initialRating = 5,
  initialComment = "",
  onClose,
  onSubmit
}) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRating(initialRating);
    setComment(initialComment);
  }, [initialComment, initialRating, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
              Leave Review
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Share your experience with {revieweeName || "this user"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ratings are shown on trust sections after completed transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-900">Rating</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const isActive = rating === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {value} Star{value > 1 ? "s" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-900">Comment (optional)</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              className="ui-textarea mt-3 text-sm"
              placeholder="What went well, and what should future readers know?"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ui-btn-secondary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSubmit({ rating, comment })}
              disabled={isSubmitting}
              className="ui-btn-primary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
