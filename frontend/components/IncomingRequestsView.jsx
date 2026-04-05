"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { ToastViewport } from "@/components/ToastViewport";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";
import {
  getPrimaryBookImage,
  hydrateRequestBookImages,
  mergeRequestWithBookImage
} from "@/lib/bookImages";
import { canOpenChat, getChatHref } from "@/lib/chats";
import { buildWhatsAppUrl, canUseWhatsApp } from "@/lib/contact";
import {
  formatRequestDate,
  formatRequestDateTime,
  getRequestPricingDetails,
  getRequestStatusTone,
  isHistoricalRequestStatus,
  toRequestStatusLabel
} from "@/lib/rentalRequests";

const PAGE_LIMIT = 20;
const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "return_pending", label: "Return Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" }
];

export function IncomingRequestsView() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

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

  const handleAction = async (requestId, action, payload = undefined, method = "PUT") => {
    if (!token) {
      return;
    }

    setActiveRequestId(requestId);
    setActionMessage("");
    setActionError("");

    try {
      const data = await apiRequest(`/rent-requests/${requestId}/${action}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload ? JSON.stringify(payload) : undefined
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

  const handleRejectStart = (requestId) => {
    setRejectingRequestId(requestId);
    setRejectionReason("");
    setActionError("");
    setActionMessage("");
  };

  const handleRejectCancel = () => {
    setRejectingRequestId("");
    setRejectionReason("");
    setActionError("");
  };

  const handleRejectSubmit = async (requestId) => {
    await handleAction(requestId, "reject", {
      rejectionReason
    });
    setRejectingRequestId("");
    setRejectionReason("");
  };

  const currentRequests = requests.filter((request) => !isHistoricalRequestStatus(request.status));
  const historyRequests = requests.filter((request) => isHistoricalRequestStatus(request.status));

  return (
    <ProtectedPage>
      <section className="space-y-5 md:space-y-6">
        <ToastViewport
          toasts={[
            actionMessage
              ? {
                  id: `incoming-success-${actionMessage}`,
                  tone: "success",
                  title: "Request updated",
                  message: actionMessage,
                  onDismiss: () => setActionMessage("")
                }
              : null,
            actionError
              ? {
                  id: `incoming-error-${actionError}`,
                  tone: "error",
                  title: "Action failed",
                  message: actionError,
                  onDismiss: () => setActionError("")
                }
              : null
          ]}
        />
        <div className="request-page-hero ui-surface p-5 sm:p-6 lg:p-8">
          <div className="request-page-toolbar flex flex-col gap-3.5 lg:flex-row lg:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700">
                Incoming Requests
              </p>
              <h1 className="mt-2 text-[1.85rem] font-semibold text-slate-900 sm:text-[2.25rem]">
                Review requests for your books
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Approve or reject new requests and keep an eye on the full request history for your
                listings.
              </p>
            </div>

            <Link href="/my-listings" className="ui-btn-primary">
              View my listings
            </Link>
          </div>

          <div className="request-filter-row mt-5 sm:mt-6">
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;

              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  onClick={() => handleFilterChange(filter.value)}
                  className={`request-filter-pill ${isActive ? "request-filter-pill-active" : ""}`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : requests.length === 0 ? (
          <EmptyState statusFilter={statusFilter} />
        ) : (
          <div className="space-y-4 md:space-y-5">
            {statusFilter ? (
              <RequestGrid
                requests={requests}
                activeRequestId={activeRequestId}
                rejectingRequestId={rejectingRequestId}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
                handleAction={handleAction}
                handleRejectStart={handleRejectStart}
                handleRejectSubmit={handleRejectSubmit}
                handleRejectCancel={handleRejectCancel}
              />
            ) : (
              <div className="space-y-6">
                <RequestSection
                  title="Current requests"
                  description="Pending, approved, active, and return-pending requests stay together so owner actions are easy to spot."
                  requests={currentRequests}
                  activeRequestId={activeRequestId}
                  rejectingRequestId={rejectingRequestId}
                  rejectionReason={rejectionReason}
                  setRejectionReason={setRejectionReason}
                  handleAction={handleAction}
                  handleRejectStart={handleRejectStart}
                  handleRejectSubmit={handleRejectSubmit}
                  handleRejectCancel={handleRejectCancel}
                />
                <RequestSection
                  title="History"
                  description="Completed and rejected requests stay separate from the work you still need to review."
                  requests={historyRequests}
                  activeRequestId={activeRequestId}
                  rejectingRequestId={rejectingRequestId}
                  rejectionReason={rejectionReason}
                  setRejectionReason={setRejectionReason}
                  handleAction={handleAction}
                  handleRejectStart={handleRejectStart}
                  handleRejectSubmit={handleRejectSubmit}
                  handleRejectCancel={handleRejectCancel}
                />
              </div>
            )}

            {totalPages > 1 ? (
              <div className="request-pagination">
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

function RequestSection(props) {
  if (props.requests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3.5 md:space-y-4">
      <div className="request-section-heading">
        <h2 className="text-xl font-semibold text-slate-900">{props.title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">{props.description}</p>
      </div>
      <RequestGrid {...props} />
    </section>
  );
}

function getStatusDetail(request) {
  if (request.status === "pending") {
    return "New request waiting for your approval decision.";
  }

  if (request.status === "approved") {
    return "Approved. The renter can now use Start Rent to lock payment and begin the rental.";
  }

  if (request.status === "active") {
    return "Rental is active. Wait for the renter to initiate return.";
  }

  if (request.status === "return_pending") {
    return "Return started. Confirm the book has been returned.";
  }

  if (request.status === "completed") {
    return "This request has been completed successfully.";
  }

  if (request.status === "rejected") {
    return "This request was declined.";
  }

  return "Review this request and take action if needed.";
}

function RequestGrid({
  requests,
  activeRequestId,
  rejectingRequestId,
  rejectionReason,
  setRejectionReason,
  handleAction,
  handleRejectStart,
  handleRejectSubmit,
  handleRejectCancel
}) {
  const safeRequests = requests.filter((request) => {
    if (!request?.book) {
      console.warn("Missing book in request:", request?.id || request?._id);
      return false;
    }

    return true;
  });

  return (
    <div className="grid gap-3.5 md:gap-4">
      {safeRequests.map((request) => {
        const isPending = request.status === "pending";
        const isReturnPending = request.status === "return_pending";
        const isApproved = request.status === "approved";
        const isSubmitting = activeRequestId === request.id;
        const isRejectingThisRequest = rejectingRequestId === request.id;
        const renterPhoneNumber = request.renter?.phoneNumber || "";
        const whatsappUrl = buildWhatsAppUrl(renterPhoneNumber, request.book?.title || "your book");
        const canContactOnWhatsapp = canOpenChat(request) && canUseWhatsApp(renterPhoneNumber);
        const pricingDetails = getRequestPricingDetails(request);
        const statusLabel = toRequestStatusLabel(request.status);
        const statusTone = getRequestStatusTone(request.status);
        const renterName = request.renter?.name || "Unknown reader";
        const dailyRent = pricingDetails?.find((detail) => detail.label === "Approx per day")?.value || "";
        const totalRent = pricingDetails?.find((detail) => detail.label === "Total rent")?.value;
        const rentalDays = pricingDetails?.find((detail) => detail.label === "Rental days")?.value;
        const weeklyRent = pricingDetails?.find((detail) => detail.label === "Rent per week")?.value;
        const lifecycleNote = getIncomingLifecycleNote(request);

        return (
          <article key={request.id} className="request-card ui-card p-3.5 sm:p-4 lg:p-5 xl:p-6">
            <div className="request-card-layout">
              <div className="request-card-main xl:min-w-0 xl:flex-[1.05]">
                <BookCover
                  src={getPrimaryBookImage(request.book)}
                  title={request.book?.title}
                  ratioClassName="aspect-[4/5]"
                  containerClassName="request-card-cover"
                  labelClassName="tracking-[0.2em]"
                />
                <div className="request-card-identity">
                  <div>
                    <div className="request-card-badges">
                      {request.book?.category ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
                          {request.book?.category}
                        </p>
                      ) : null}
                      <span className="request-card-type-pill">
                        Incoming request
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold leading-tight text-slate-900 sm:text-[1.35rem]">
                      {request.book?.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.book?.author ? `by ${request.book.author}` : "Author unavailable"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="request-card-meta xl:min-w-0 xl:flex-1">
                <InfoRow
                  label="Requester"
                  value={renterName}
                  meta={
                    request.renter?.phoneNumber ? `Phone: ${request.renter.phoneNumber}` : undefined
                  }
                />
                <InfoRow
                  label="Rental dates"
                  value={`${formatRequestDate(request.startDate)} - ${formatRequestDate(request.endDate)}`}
                />
                <InfoRow
                  label="Rent summary"
                  value={totalRent ? `${totalRent} total` : "Not available"}
                  meta={dailyRent || rentalDays ? `${dailyRent}${rentalDays ? ` - ${rentalDays} days` : ""}` : undefined}
                />
                <InfoRow label="Requested on" value={formatRequestDateTime(request.createdAt)} />
                {weeklyRent ? <InfoRow label="Weekly rent" value={weeklyRent} /> : null}
                {request.book?.securityDeposit != null ? (
                  <InfoRow label="Security deposit" value={formatPrice(request.book.securityDeposit)} />
                ) : null}
              </div>

              <div className="request-card__aside request-card-aside ui-subtle-card">
                <div className="flex flex-col gap-4">
                  <div className="space-y-3">
                    <div className="request-status-block">
                      <span
                        className={`request-status-pill inline-flex w-fit rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{getStatusDetail(request)}</p>
                    <div className="request-note-panel">
                      <p className="ui-trust-label">Owner guidance</p>
                      <p className="ui-trust-copy">{lifecycleNote}</p>
                    </div>
                  </div>

                  <div className="request-card__actions border-t border-slate-200/80 pt-4">
                      <div className="request-action-stack">
                      <Link href={`/books/${request.book?.id}`} className="ui-btn-secondary w-full px-4 py-2">
                        View book
                      </Link>
                      {canOpenChat(request) ? (
                        <>
                          <Link href={getChatHref(request)} className="ui-btn-primary w-full px-4 py-2">
                            Open Chat
                          </Link>
                          <p className="px-1 text-xs leading-5 text-slate-500">
                            Use in-app chat for coordination.
                          </p>
                        </>
                      ) : null}

                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleAction(request.id, "approve")}
                            className="ui-btn-success w-full px-4 py-2"
                          >
                            {isSubmitting ? "Updating..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleRejectStart(request.id)}
                            className="ui-btn-danger w-full px-4 py-2"
                          >
                            {isSubmitting ? "Updating..." : "Reject"}
                          </button>
                        </>
                      ) : null}
                      {isReturnPending ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAction(request.id, "confirm-return", undefined, "POST")}
                          className="ui-btn-dark w-full px-4 py-2"
                        >
                          {isSubmitting ? "Updating..." : "Confirm Return"}
                        </button>
                      ) : null}
                      {canContactOnWhatsapp ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ui-btn-secondary w-full px-4 py-2 text-sm"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {request.status === "rejected" && request.rejectionReason ? (
              <div className="mt-3.5 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mt-4 sm:rounded-[1.5rem] sm:py-3.5">
                <p className="font-medium">Rejection reason</p>
                <p className="mt-1 leading-6">{request.rejectionReason}</p>
              </div>
            ) : null}

            {isRejectingThisRequest ? (
              <div className="mt-3.5 rounded-[1.35rem] border border-rose-200 bg-rose-50 p-3.5 sm:mt-4 sm:rounded-[1.5rem] sm:p-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-rose-900">
                    Rejection reason
                  </span>
                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    placeholder="Tell the renter why this request cannot be approved."
                  />
                </label>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    disabled={isSubmitting || !rejectionReason.trim()}
                    onClick={() => handleRejectSubmit(request.id)}
                    className="ui-btn-danger-soft border-rose-300 bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-400 disabled:text-white"
                  >
                    {isSubmitting ? "Rejecting..." : "Confirm rejection"}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRejectCancel}
                    className="ui-btn-light px-4 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value, meta }) {
  return (
    <div className="request-info-card">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value || "Not available"}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p> : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3.5 md:gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <RequestLoadingCard key={index} />
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="ui-feedback-error ui-feedback-panel">
      <h2 className="ui-feedback-title">Unable to load incoming requests</h2>
      <p className="ui-feedback-body">{message}</p>
    </div>
  );
}

function EmptyState({ statusFilter }) {
  const hasFilter = Boolean(statusFilter);

  return (
    <div className="request-empty-state">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="request-empty-main">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            Incoming Requests
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {hasFilter ? "No requests in this status" : "No incoming requests yet"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            {hasFilter
              ? "Try another filter to review older request activity for your books."
              : "When readers request your books, they will appear here with approval actions, rental details, and request status in one place."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/my-listings" className="ui-btn-primary">
              Go to my listings
            </Link>
            <Link href="/books/new" className="ui-btn-secondary">
              Add another book
            </Link>
          </div>
        </div>

        <div className="request-empty-side">
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Why this matters</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Keep pending decisions visible and handle approvals or returns quickly.
            </p>
          </div>
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Next step</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Review your listings or add another book so new requests can start flowing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getIncomingLifecycleNote(request) {
  if (request.status === "pending") {
    return "Review the reader details and rental window before approving, because approval reserves the book.";
  }

  if (request.status === "approved") {
    return "This request is approved, so the reader can now use Start Rent after handoff to lock payment and begin the rental.";
  }

  if (request.status === "active") {
    return `The book is already out. Expect the return after ${formatRequestDate(request.endDate)} unless the renter reaches out earlier.`;
  }

  if (request.status === "return_pending") {
    return "The renter has started the return flow. Confirm only after the handback is complete.";
  }

  if (request.status === "completed") {
    return "The full request lifecycle is complete, so this now serves as a trustworthy history record.";
  }

  if (request.status === "rejected") {
    return "This request was declined, so the book remains available for other readers if your listing status allows it.";
  }

  return "Use the current status and book details together before taking the next action.";
}

function RequestLoadingCard() {
  return (
    <div className="request-card ui-card p-3.5 sm:p-4 lg:p-5 xl:p-6">
      <div className="request-card-layout">
        <div className="request-card-main xl:flex-[1.05]">
          <div className="ui-skeleton request-card-cover aspect-[4/5]" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="ui-skeleton-pill w-24" />
                <div className="ui-skeleton-pill w-28" />
              </div>
              <div className="ui-skeleton-title w-3/4" />
              <div className="ui-skeleton-line w-1/2" />
            </div>
          </div>
        </div>

        <div className="request-card-meta xl:flex-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="ui-skeleton h-20 rounded-2xl" />
          ))}
        </div>

        <div className="request-card__aside request-card-aside ui-subtle-card">
          <div className="space-y-3">
            <div className="ui-skeleton-pill w-28" />
            <div className="ui-skeleton-line w-full" />
            <div className="ui-skeleton-button w-full" />
            <div className="ui-skeleton-button w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
