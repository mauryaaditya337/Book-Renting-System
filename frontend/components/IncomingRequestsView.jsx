"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import {
  getPrimaryBookImage,
  hydrateRequestBookImages,
  mergeRequestWithBookImage
} from "@/lib/bookImages";
import {
  formatRequestDate,
  formatRequestDateTime,
  getRequestStatusTone,
  toRequestStatusLabel
} from "@/lib/rentalRequests";

const PAGE_LIMIT = 20;
const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "return_pending", label: "Return Pending" },
  { value: "completed", label: "Completed" }
];

export function IncomingRequestsView() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRequests() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const searchParams = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_LIMIT)
        });

        if (statusFilter) {
          searchParams.set("status", statusFilter);
        }

        const data = await apiRequest(`/rent-requests/incoming?${searchParams.toString()}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const requestsWithImages = await hydrateRequestBookImages(data.requests || []);

        if (isActive) {
          setRequests(requestsWithImages);
          setTotalPages(data.totalPages || 1);
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

    loadRequests();

    return () => {
      isActive = false;
    };
  }, [currentPage, statusFilter, token]);

  const handleFilterChange = (nextFilter) => {
    setStatusFilter(nextFilter);
    setCurrentPage(1);
    setActionMessage("");
    setActionError("");
  };

  const handleAction = async (requestId, action) => {
    if (!token) {
      return;
    }

    setActiveRequestId(requestId);
    setActionMessage("");
    setActionError("");

    try {
      const data = await apiRequest(`/rent-requests/${requestId}/${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRequests((current) =>
        current
          .map((request) =>
            request.id === requestId
              ? mergeRequestWithBookImage(request, data.rentalRequest)
              : request
          )
          .filter((request) => !statusFilter || request.status === statusFilter)
      );
      setActionMessage(data.message || "Request updated successfully.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActiveRequestId("");
    }
  };

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                Incoming Requests
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Review requests for your books
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Approve or reject new requests and keep an eye on the full request history for your
                listings.
              </p>
            </div>

            <Link
              href="/my-listings"
              className="rounded-2xl bg-teal-700 px-5 py-3 text-center font-medium text-white transition hover:bg-teal-800"
            >
              View my listings
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;

              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  onClick={() => handleFilterChange(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {actionMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </p>
        ) : null}

        {actionError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : requests.length === 0 ? (
          <EmptyState statusFilter={statusFilter} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {requests.map((request) => {
                const isPending = request.status === "pending";
                const isSubmitting = activeRequestId === request.id;

                return (
                <article
                  key={request.id}
                  className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <BookCover
                          src={getPrimaryBookImage(request.book)}
                          title={request.book?.title}
                          ratioClassName="aspect-[4/5]"
                          containerClassName="w-24 shrink-0 rounded-[1.25rem]"
                          labelClassName="tracking-[0.2em]"
                        />
                        <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                            {request.book?.category}
                          </p>
                          <h2 className="mt-2 text-xl font-semibold text-slate-900">
                            {request.book?.title}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600">
                            Requested by {request.renter?.name || "Unknown reader"}
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                          <InfoRow
                            label="Reader email"
                            value={request.renter?.email || "Not available"}
                          />
                          <InfoRow label="Start date" value={formatRequestDate(request.startDate)} />
                          <InfoRow label="End date" value={formatRequestDate(request.endDate)} />
                          <InfoRow
                            label="Requested on"
                            value={formatRequestDateTime(request.createdAt)}
                          />
                        </div>
                      </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:min-w-56 lg:items-end">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRequestStatusTone(
                            request.status
                          )}`}
                        >
                          {toRequestStatusLabel(request.status)}
                        </span>

                        <div className="flex flex-col gap-3 sm:flex-row lg:w-full lg:flex-col">
                          <Link
                            href={`/books/${request.book?.id}`}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                          >
                            View book
                          </Link>

                          {isPending ? (
                            <>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleAction(request.id, "approve")}
                                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                {isSubmitting ? "Updating..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleAction(request.id, "reject")}
                                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                {isSubmitting ? "Updating..." : "Reject"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
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
          className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">Unable to load incoming requests</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyState({ statusFilter }) {
  const hasFilter = Boolean(statusFilter);

  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">
        {hasFilter ? "No requests in this status" : "No incoming requests yet"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {hasFilter
          ? "Try another filter to review older request activity for your books."
          : "When someone requests one of your books, it will appear here for review and approval."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/my-listings"
          className="inline-flex rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
        >
          Go to my listings
        </Link>
        <Link
          href="/books/new"
          className="inline-flex rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Add another book
        </Link>
      </div>
    </div>
  );
}
