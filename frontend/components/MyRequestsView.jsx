"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { ToastViewport } from "@/components/ToastViewport";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";
import { getPrimaryBookImage, hydrateRequestBookImages } from "@/lib/bookImages";
import { canOpenChat, getChatHref } from "@/lib/chats";
import { buildWhatsAppUrl, canUseWhatsApp } from "@/lib/contact";
import {
  formatRequestDate,
  formatRequestDateTime,
  HISTORY_REQUEST_STATUSES,
  CURRENT_REQUEST_STATUSES,
  getRequestPricingDetails,
  getRequestStatusTone,
  toRequestStatusLabel
} from "@/lib/rentalRequests";

const PAGE_LIMIT = 20;

const RENTER_ACTION_CONFIG = {
  startRent: {
    action: "start-rent",
    method: "PATCH",
    label: "Start Rent",
    loadingLabel: "Starting rent...",
    confirmMessage:
      "Start this rental now? This locks the rent and deposit in escrow and starts the rental. Use it after you receive the book."
  },
  initiateReturn: {
    action: "initiate-return",
    method: "PATCH",
    label: "Initiate Return",
    loadingLabel: "Initiating return...",
    confirmMessage: "Initiate the return now? Use this when you are ready to hand the book back."
  }
};

export function MyRequestsView() {
  return <RequestsDashboardView mode="current" />;
}

export function MyOrdersView() {
  return <RequestsDashboardView mode="history" />;
}

function RequestsDashboardView({ mode = "current" }) {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
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
        const data = await apiRequest(`/rent-requests/outgoing?page=1&limit=${PAGE_LIMIT}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const requestsWithImages = await hydrateRequestBookImages(data.requests || []);

        if (isActive) {
          setRequests(requestsWithImages);
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
  }, [token]);

  const handleRequestAction = async (requestId, action) => {
    if (!token) {
      return;
    }

    const actionConfig = RENTER_ACTION_CONFIG[action];

    if (!actionConfig) {
      return;
    }

    if (typeof window !== "undefined" && !window.confirm(actionConfig.confirmMessage)) {
      return;
    }

    setActiveRequestId(requestId);
    setActionMessage("");
    setActionError("");

    try {
      const data = await apiRequest(`/rent-requests/${requestId}/${actionConfig.action}`, {
        method: actionConfig.method,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, ...data.rentalRequest, book: { ...request.book, ...data.rentalRequest.book } }
            : request
        )
      );
      setActionMessage(data.message || "Request updated successfully.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActiveRequestId("");
    }
  };

  const visibleStatuses =
    mode === "history" ? HISTORY_REQUEST_STATUSES : CURRENT_REQUEST_STATUSES;
  const visibleRequests = requests.filter((request) => visibleStatuses.includes(request.status));
  const isOrdersMode = mode === "history";

  return (
    <ProtectedPage>
      <section className="space-y-5 md:space-y-6">
        <ToastViewport
          toasts={[
            actionMessage
              ? {
                  id: `request-success-${actionMessage}`,
                  tone: "success",
                  title: "Request updated",
                  message: actionMessage,
                  onDismiss: () => setActionMessage("")
                }
              : null,
            actionError
              ? {
                  id: `request-error-${actionError}`,
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
                {isOrdersMode ? "My Orders" : "My Requests"}
              </p>
              <h1 className="mt-2 text-[1.85rem] font-semibold text-slate-900 sm:text-[2.25rem]">
                {isOrdersMode ? "Review your request history" : "Track your outgoing book requests"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {isOrdersMode
                  ? "See your completed and rejected requests in one place, including finished rentals and rejection details."
                  : "Review the books you have requested, who owns them, and the current request status."}
              </p>
            </div>

            <Link href="/books" className="ui-btn-primary">
              Browse books
            </Link>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : visibleRequests.length === 0 ? (
          <EmptyState mode={mode} />
        ) : (
          <RequestSection
            title={isOrdersMode ? "Order history" : "Current requests"}
            description={
              isOrdersMode
                ? "Completed rentals and rejected requests stay here so your active flow remains uncluttered."
                : "Pending, approved, active, and return-confirmation steps stay grouped here until the flow is finished."
            }
            requests={visibleRequests}
            activeRequestId={activeRequestId}
            onRequestAction={handleRequestAction}
          />
        )}
      </section>
    </ProtectedPage>
  );
}

function getStatusDetail(request, isSellRequest) {
  if (request.status === "pending") {
    return "Waiting for the owner to review your request.";
  }

  if (request.status === "approved" && !isSellRequest && request.paymentStatus === "unpaid") {
    return "Approved. Start Rent locks payment in escrow and starts the rental after handoff.";
  }

  if (request.status === "approved" && !isSellRequest) {
    return "Approved. Start Rent is the next step after handoff.";
  }

  if (request.status === "approved" && isSellRequest) {
    return "The seller approved your purchase request.";
  }

  if (request.status === "active") {
    return "Your rental is active. Return it when you're done.";
  }

  if (request.status === "return_pending") {
    return "Return started. Waiting for owner confirmation.";
  }

  if (request.status === "completed") {
    return "This request has been completed.";
  }

  if (request.status === "rejected") {
    return "This request was not approved.";
  }

  return "Track the latest status of this request here.";
}

function getDateSummary(request, isSellRequest) {
  if (isSellRequest) {
    return "Purchase request";
  }

  return `${formatRequestDate(request.startDate)} - ${formatRequestDate(request.endDate)}`;
}

function RequestSection({ title, description, requests, activeRequestId, onRequestAction }) {
  const safeRequests = requests.filter((request) => {
    if (!request?.book) {
      console.warn("Missing book in request:", request?.id || request?._id);
      return false;
    }

    return true;
  });

  if (safeRequests.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3.5 md:space-y-4">
      <div className="request-section-heading">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
      </div>

      <div className="grid gap-3.5 md:gap-4">
        {safeRequests.map((request) => {
          const isSellRequest = request.book?.listingType === "sell";
          const isSubmitting = activeRequestId === request.id;
          const primaryRenterAction = getPrimaryRenterAction(request, isSellRequest);
          const pricingDetails = getRequestPricingDetails(request);
          const statusLabel = toRequestStatusLabel(request.status);
          const statusTone = getRequestStatusTone(request.status);
          const statusDetail = getStatusDetail(request, isSellRequest);
          const ownerName = request.owner?.name || "Unknown";
          const lifecycleNote = getLifecycleNote(request, isSellRequest);
          const perDayRent = pricingDetails?.find((detail) => detail.label === "Approx per day")?.value || "";
          const rentalDays = pricingDetails?.find((detail) => detail.label === "Rental days")?.value;
          const rentSummaryMeta = `${perDayRent}${rentalDays ? ` - ${rentalDays} days` : ""}`;
          const ownerPhoneNumber = request.owner?.phoneNumber || "";
          const whatsappUrl = buildWhatsAppUrl(ownerPhoneNumber, request.book?.title || "this book");
          const canContactOnWhatsapp = canOpenChat(request) && canUseWhatsApp(ownerPhoneNumber);

          return (
            <article key={request.id} className="request-card ui-card p-3.5 sm:p-4 lg:p-5 xl:p-6">
              <div className="request-card-layout">
                <div className="request-card-main xl:min-w-0">
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
                          {isSellRequest ? "Buy request" : "Rent request"}
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

                <div className="request-card-meta xl:min-w-0">
                  <InfoRow label="Owner" value={ownerName} />
                  <InfoRow
                    label={isSellRequest ? "Request type" : "Rental dates"}
                    value={getDateSummary(request, isSellRequest)}
                  />
                  {pricingDetails ? (
                    <InfoRow
                      label="Rent summary"
                      value={`${pricingDetails.find((detail) => detail.label === "Total rent")?.value || "Not available"} total`}
                      meta={rentSummaryMeta || undefined}
                    />
                  ) : (
                    <InfoRow
                      label="Amount"
                      value="See book details"
                      meta="Pricing is handled on the book listing"
                    />
                  )}
                  <InfoRow label="Requested on" value={formatRequestDateTime(request.createdAt)} />
                  {!isSellRequest && request.book?.securityDeposit != null ? (
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
                      <p className="text-sm leading-6 text-slate-600">{statusDetail}</p>
                      <div className="request-note-panel">
                        <p className="ui-trust-label">What happens next</p>
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
                        {request.status === "pending" ? (
                          <div className="request-static-action border-amber-200 bg-amber-50 text-amber-700">
                            Pending Approval
                          </div>
                        ) : null}
                        {request.status === "rejected" ? (
                          <div className="request-static-action border-rose-200 bg-rose-50 text-rose-700">
                            Request Rejected
                          </div>
                        ) : null}
                        {primaryRenterAction ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => onRequestAction(request.id, primaryRenterAction.key)}
                            className="ui-btn-dark w-full px-4 py-2"
                          >
                            {isSubmitting ? primaryRenterAction.loadingLabel : primaryRenterAction.label}
                          </button>
                        ) : null}
                        {request.status === "return_pending" && !isSellRequest ? (
                          <div className="request-static-action border-indigo-200 bg-indigo-50 text-indigo-700">
                            Waiting for owner confirmation
                          </div>
                        ) : null}
                        {request.status === "approved" && isSellRequest ? (
                          <div className="request-static-action border-emerald-200 bg-emerald-50 text-emerald-700">
                            Seller approved your purchase request
                          </div>
                        ) : null}
                        {request.status === "completed" ? (
                          <div className="request-static-action border-teal-200 bg-teal-50 text-teal-700">
                            Completed
                          </div>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getLifecycleNote(request, isSellRequest) {
  if (request.status === "pending") {
    return "The owner still needs to review this request before anything is reserved or started.";
  }

  if (request.status === "approved" && isSellRequest) {
    return "Approval means the seller is ready to coordinate the purchase handoff with you.";
  }

  if (request.status === "approved") {
    return isSellRequest
      ? "Approval means the seller is ready to coordinate the purchase handoff with you."
      : "Approval reserves the book for you. Once the handoff happens, Start Rent locks payment in escrow and activates the rental.";
  }

  if (request.status === "active") {
    return `Keep an eye on the return window ending ${formatRequestDate(request.endDate)} so the handback stays smooth.`;
  }

  if (request.status === "return_pending") {
    return "You already initiated the return. The flow closes once the owner confirms it.";
  }

  if (request.status === "completed") {
    return "This request is fully closed out and stays here as a reliable record of the finished rental.";
  }

  if (request.status === "rejected") {
    return "The owner did not approve this request, so no rental or handoff can proceed from it.";
  }

  return "Follow the current status here to understand the next safe step.";
}

function getPrimaryRenterAction(request, isSellRequest) {
  if (isSellRequest) {
    return null;
  }

  if (request.status === "approved") {
    return {
      key: "startRent",
      ...RENTER_ACTION_CONFIG.startRent
    };
  }

  if (request.status === "active") {
    return {
      key: "initiateReturn",
      ...RENTER_ACTION_CONFIG.initiateReturn
    };
  }

  return null;
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
      <h2 className="ui-feedback-title">Unable to load requests</h2>
      <p className="ui-feedback-body">{message}</p>
    </div>
  );
}

function EmptyState({ mode = "current" }) {
  const isOrdersMode = mode === "history";

  return (
    <div className="request-empty-state">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="request-empty-main">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            {isOrdersMode ? "My Orders" : "My Requests"}
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {isOrdersMode ? "No order history yet" : "No outgoing requests yet"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            {isOrdersMode
              ? "Completed rentals and rejected requests will appear here once your request flow has a final outcome."
              : "Once you request a book, it will show up here with its status, rental timeline, and next actions in one place."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/books" className="ui-btn-primary">
              Browse books
            </Link>
            <Link href={isOrdersMode ? "/my-requests" : "/active-rentals"} className="ui-btn-secondary">
              {isOrdersMode ? "View current requests" : "View active rentals"}
            </Link>
          </div>
        </div>

        <div className="request-empty-side">
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">How this helps</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {isOrdersMode
                ? "Keep past outcomes separate so completed and rejected requests stay easy to review."
                : "Track approvals, returns, and active rental steps without digging through older outcomes."}
            </p>
          </div>
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">What to do next</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {isOrdersMode
                ? "Finish a rental or review current requests, then come back here to see the final history."
                : "Explore listings, request a book you want, and come back here to follow the flow."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestLoadingCard() {
  return (
    <div className="request-card ui-card p-3.5 sm:p-4 lg:p-5 xl:p-6">
      <div className="request-card-layout">
        <div className="request-card-main xl:flex-[1.1]">
          <div className="ui-skeleton request-card-cover aspect-[4/5]" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="ui-skeleton-pill w-24" />
                <div className="ui-skeleton-pill w-24" />
              </div>
              <div className="ui-skeleton-title w-3/4" />
              <div className="ui-skeleton-line w-1/2" />
            </div>
          </div>
        </div>

        <div className="request-card-meta xl:flex-1">
          {Array.from({ length: 4 }).map((_, index) => (
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
