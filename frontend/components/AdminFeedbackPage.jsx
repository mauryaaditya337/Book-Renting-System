"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "bug", label: "Bug" },
  { value: "suggestion", label: "Suggestion" },
  { value: "general", label: "General" }
];

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" }
];

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getFeedbackTone(type) {
  if (type === "bug") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (type === "suggestion") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getStatusTone(status) {
  return status === "reviewed"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
}

export function AdminFeedbackPage() {
  const { token, user } = useAuth();
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFeedbackId, setActiveFeedbackId] = useState("");

  const requestOptions = useMemo(
    () => ({
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    [token]
  );

  useEffect(() => {
    let isActive = true;

    async function loadFeedback() {
      if (!token || !user?.isAdmin) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const searchParams = new URLSearchParams();

        if (typeFilter) {
          searchParams.set("type", typeFilter);
        }

        if (statusFilter) {
          searchParams.set("status", statusFilter);
        }

        const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
        const data = await apiRequest(`/feedback${suffix}`, requestOptions);

        if (isActive) {
          setFeedbackItems(Array.isArray(data.feedback) ? data.feedback : []);
        }
      } catch (error) {
        if (isActive) {
          setFeedbackItems([]);
          setErrorMessage(error.message || "Unable to load feedback.");
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
  }, [requestOptions, statusFilter, token, typeFilter, user]);

  const handleMarkReviewed = async (feedbackId) => {
    if (!token) {
      return;
    }

    setActiveFeedbackId(feedbackId);
    setErrorMessage("");

    try {
      const data = await apiRequest(`/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: "reviewed"
        })
      });

      setFeedbackItems((current) =>
        current.map((item) => (item.id === feedbackId ? data.feedback : item))
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to update feedback status.");
    } finally {
      setActiveFeedbackId("");
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-700">Admin Only</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">You do not have access to feedback management</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          This dashboard is reserved for admin accounts that manage platform feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Admin Feedback</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
          Review all submitted platform feedback
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Filter by feedback type and review state, then mark items as reviewed once you have processed them.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="ui-input mt-2 text-sm"
            >
              {TYPE_FILTERS.map((filter) => (
                <option key={filter.value || "all"} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="ui-input mt-2 text-sm"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value || "all"} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ui-skeleton-card space-y-4">
              <div className="flex gap-2">
                <div className="ui-skeleton-pill w-20" />
                <div className="ui-skeleton-pill w-24" />
              </div>
              <div className="ui-skeleton-line w-full" />
              <div className="ui-skeleton-line w-4/5" />
              <div className="ui-skeleton-button w-40" />
            </div>
          ))}
        </div>
      ) : feedbackItems.length === 0 ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
          No feedback matches the current filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {feedbackItems.map((item) => {
            const submittedBy =
              item.user?.fullName ||
              item.user?.name ||
              "Guest / anonymous";
            const submittedMeta = [item.user?.collegeName, item.user?.email].filter(Boolean).join(" • ");
            const isUpdating = activeFeedbackId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getFeedbackTone(item.type)}`}>
                    {item.type}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusTone(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-800">{item.message}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoBlock label="Submitted by" value={submittedBy} meta={submittedMeta || undefined} />
                  <InfoBlock label="Page" value={item.page || "Not provided"} />
                  <InfoBlock label="Created" value={formatDateTime(item.createdAt)} />
                </div>

                <div className="mt-5">
                  {item.status === "reviewed" ? (
                    <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      Reviewed
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleMarkReviewed(item.id)}
                      className="ui-btn-primary"
                    >
                      {isUpdating ? "Updating..." : "Mark as reviewed"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value, meta }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-800">{value}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p> : null}
    </div>
  );
}
