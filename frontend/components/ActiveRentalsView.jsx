"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { ToastViewport } from "@/components/ToastViewport";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { canOpenChat, getChatHref } from "@/lib/chats";
import { buildWhatsAppUrl, canUseWhatsApp } from "@/lib/contact";
import { getPrimaryBookImage, hydrateRequestBookImages, mergeRequestWithBookImage } from "@/lib/bookImages";
import { formatRequestDate, getRequestStatusTone, toRequestStatusLabel } from "@/lib/rentalRequests";

const PAGE_LIMIT = 20;

const VIEW_CONFIG = {
  renter: {
    apiPath: "/rent-requests/active/renter",
    eyebrow: "Active Rentals",
    title: "Books you are currently renting",
    description:
      "Track your live rentals and return a book once you have completed the rental.",
    primaryLabel: "Owner",
    emptyTitle: "No active rentals yet",
    emptyDescription: "Once you start an approved rental, it will appear here for tracking.",
    ctaHref: "/books",
    ctaLabel: "Browse books",
    secondaryEmptyHref: "/my-requests",
    secondaryEmptyLabel: "View my requests",
    actionLabel: "Return Book",
    actionVerb: "initiate-return",
    actionMethod: "PATCH",
    confirmMessage: "Initiate the return now? Use this when you are ready to hand the book back.",
    successFallback: "Return initiated successfully.",
    secondaryHref: "/my-requests",
    secondaryLabel: "View my requests"
  },
  owner: {
    apiPath: "/rent-requests/active/owner",
    eyebrow: "Owner Rentals",
    title: "Reserved and active rentals for your books",
    description:
      "Monitor approved reservations and active rentals for your listings in one place.",
    primaryLabel: "Renter",
    emptyTitle: "No owner-side active rentals yet",
    emptyDescription: "Once one of your books is rented out, it will show up here for tracking.",
    ctaHref: "/my-listings",
    ctaLabel: "Go to my listings",
    secondaryEmptyHref: "/incoming-requests",
    secondaryEmptyLabel: "Review incoming requests",
    actionLabel: "Confirm Return",
    actionVerb: "confirm-return",
    actionMethod: "PATCH",
    confirmMessage: "Confirm the return now? Use this only after the book is physically back with you.",
    successFallback: "Return confirmed successfully.",
    secondaryHref: "/incoming-requests",
    secondaryLabel: "View incoming requests"
  }
};

export function ActiveRentalsView({ mode }) {
  const config = VIEW_CONFIG[mode];
  const { token } = useAuth();

  const [requests, setRequests] = useState([]);
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
        const data = await apiRequest(`${config.apiPath}?page=${currentPage}&limit=${PAGE_LIMIT}`, {
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
  }, [config.apiPath, currentPage, token]);

  const handleAction = async (requestId) => {
    if (!token) {
      return;
    }

    if (config.confirmMessage && typeof window !== "undefined" && !window.confirm(config.confirmMessage)) {
      return;
    }

    setActiveRequestId(requestId);
    setActionMessage("");
    setActionError("");

    try {
      const data = await apiRequest(`/rent-requests/${requestId}/${config.actionVerb}`, {
        method: config.actionMethod || "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? mergeRequestWithBookImage(request, data.rentalRequest)
            : request
        )
      );
      setActionMessage(data.message || config.successFallback);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActiveRequestId("");
    }
  };

  return (
    <ProtectedPage>
      <section className="space-y-5 md:space-y-6">
        <ToastViewport
          toasts={[
            actionMessage
              ? {
                  id: `rental-success-${actionMessage}`,
                  tone: "success",
                  title: "Rental updated",
                  message: actionMessage,
                  onDismiss: () => setActionMessage("")
                }
              : null,
            actionError
              ? {
                  id: `rental-error-${actionError}`,
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
                {config.eyebrow}
              </p>
              <h1 className="mt-2 text-[1.85rem] font-semibold text-slate-900 sm:text-[2.25rem]">
                {config.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {config.description}
              </p>
            </div>

            <Link href={config.secondaryHref} className="ui-btn-primary">
              {config.secondaryLabel}
            </Link>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} title={config.eyebrow} />
        ) : requests.length === 0 ? (
          <EmptyState config={config} />
        ) : (
          <div className="space-y-4 md:space-y-5">
            <div className="grid gap-3.5 md:gap-4">
              {requests.map((request) => {
                const isSubmitting = activeRequestId === request.id;
                const canAct =
                  mode === "renter"
                    ? request.status === "active"
                    : request.status === "return_pending";
                const statusLabel = toRequestStatusLabel(request.status);
                const statusTone = getRequestStatusTone(request.status);
                const lifecycleNote = getRentalLifecycleNote(mode, request, canAct, config.actionLabel);
                const timelineSteps = getRentalTimelineSteps(request.status);
                const dueState = getDueState(request);
                const nextStepLabel = getNextStepLabel(mode, request, canAct, config.actionLabel);
                const dueSummary = getDueSummary(request, dueState);
                const dueTone = getDueTone(dueState.level);
                const contactPhoneNumber =
                  mode === "owner" ? request.renter?.phoneNumber || "" : request.owner?.phoneNumber || "";
                const whatsappUrl = buildWhatsAppUrl(
                  contactPhoneNumber,
                  request.book?.title || "this rental"
                );
                const canContactOnWhatsapp = canOpenChat(request) && canUseWhatsApp(contactPhoneNumber);

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
                                {mode === "renter" ? "Live rental" : "Managed rental"}
                              </span>
                            </div>
                            <h2 className="mt-2 text-lg font-semibold leading-tight text-slate-900 sm:text-[1.35rem]">
                              {request.book?.title}
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                              {request.book?.author ? `by ${request.book.author}` : "Author unavailable"}
                            </p>
                          </div>

                          <div className="request-note-panel">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Rental progress
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Follow the lifecycle from approval through completion.
                                </p>
                              </div>
                              <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone}`}
                              >
                                {statusLabel}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              {timelineSteps.map((step, index) => (
                                <LifecycleStep
                                  key={step.key}
                                  step={step}
                                  isLast={index === timelineSteps.length - 1}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="request-card-meta xl:min-w-0 xl:flex-1">
                        <InfoRow label={config.primaryLabel} value={getCounterpartyName(mode, request)} />
                        <InfoRow
                          label="Rental dates"
                          value={`${formatRequestDate(request.startDate)} - ${formatRequestDate(request.endDate)}`}
                          meta="Start and end dates currently attached to this rental."
                        />
                        <InfoRow
                          label="Due date"
                          value={formatRequestDate(request.endDate)}
                          meta={dueSummary}
                          toneClassName={dueTone}
                        />
                        <InfoRow label="Current state" value={statusLabel} meta={lifecycleNote} />
                        <InfoRow
                          label="What happens next"
                          value={nextStepLabel.title}
                          meta={nextStepLabel.detail}
                        />
                      </div>

                      <div className="request-card__aside request-card-aside ui-subtle-card">
                        <div className="flex flex-col gap-4">
                          <div className="space-y-3">
                            <div className={`rental-status-panel ${dueTone}`}>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/75">
                                Timing
                              </p>
                              <p className="mt-2 text-lg font-semibold text-current">{dueSummary}</p>
                              <p className="mt-2 text-sm leading-6 text-current/85">
                                Ends on {formatRequestDate(request.endDate)}.
                              </p>
                            </div>
                            <div className="request-note-panel">
                              <p className="ui-trust-label">Lifecycle clarity</p>
                              <p className="ui-trust-copy">{lifecycleNote}</p>
                            </div>
                            <div className="request-note-panel">
                              <p className="ui-trust-label">Expected next action</p>
                              <p className="ui-trust-copy">{nextStepLabel.detail}</p>
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

                              {canAct && config.actionVerb ? (
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(request.id)}
                                  className="ui-btn-dark w-full px-4 py-2"
                                >
                                  {isSubmitting ? "Updating..." : config.actionLabel}
                                </button>
                              ) : (
                                <div className="request-static-action border-slate-200/80 bg-white/80 text-slate-600">
                                  {nextStepLabel.title}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

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

function getCounterpartyName(mode, request) {
  return mode === "renter" ? request.owner?.name || "Unknown owner" : request.renter?.name || "Unknown renter";
}

function InfoRow({ label, value, meta, toneClassName = "" }) {
  return (
    <div className={`request-info-card ${toneClassName}`}>
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
        <RentalLoadingCard key={index} />
      ))}
    </div>
  );
}

function ErrorState({ message, title }) {
  return (
    <div className="ui-feedback-error ui-feedback-panel">
      <h2 className="ui-feedback-title">Unable to load {title.toLowerCase()}</h2>
      <p className="ui-feedback-body">{message}</p>
    </div>
  );
}

function EmptyState({ config }) {
  return (
    <div className="request-empty-state">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="request-empty-main">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            {config.eyebrow}
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {config.emptyTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            {config.emptyDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={config.ctaHref} className="ui-btn-primary">
              {config.ctaLabel}
            </Link>
            {config.secondaryEmptyHref ? (
              <Link href={config.secondaryEmptyHref} className="ui-btn-secondary">
                {config.secondaryEmptyLabel}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="request-empty-side">
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">How this helps</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Keep live rentals visible and make the next action obvious at a glance.
            </p>
          </div>
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">What to do next</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Visit the linked request screen or browse books to start the next rental flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRentalLifecycleNote(mode, request, canAct, actionLabel) {
  if (request.status === "approved") {
    return mode === "renter"
      ? "Approved means the rental is ready to begin, but it is not actively out until the handoff starts."
      : "Approved means the reservation is set. The renter still needs to move the rental into the active stage.";
  }

  if (mode === "renter") {
    if (request.status === "return_pending") {
      return "You already started the return flow. Keep this rental visible until the owner confirms the handback.";
    }

    if (request.status === "completed") {
      return "This rental has been fully closed out and now serves as a clean record of the finished handoff.";
    }

    return canAct
      ? `This rental stays active until you choose "${actionLabel}". The expected end date is ${formatRequestDate(request.endDate)}.`
      : "The owner is still part of the closing step, so keep the return status visible until it is confirmed.";
  }

  if (request.status === "active") {
    return `The book is still out with the renter. Expect the return flow around ${formatRequestDate(request.endDate)} unless they reach out earlier.`;
  }

  if (request.status === "completed") {
    return "This rental has been fully completed, so this card remains only as an operational history record.";
  }

  return canAct
    ? `The renter already initiated the handback. Use "${actionLabel}" only after the book is physically returned.`
    : "This rental remains part of your active owner record until the return flow is finished.";
}

function getRentalTimelineSteps(status) {
  const order = ["approved", "active", "return_pending", "completed"];
  const currentIndex = order.indexOf(status);

  return order.map((key, index) => ({
    key,
    label: toRequestStatusLabel(key),
    isCurrent: key === status,
    isComplete: currentIndex > index,
    isUpcoming: currentIndex < index
  }));
}

function LifecycleStep({ step, isLast }) {
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:items-start">
      <div className="flex items-center gap-3 sm:w-full">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
            step.isCurrent
              ? "border-slate-900 bg-slate-900 text-white"
              : step.isComplete
                ? "border-teal-200 bg-teal-50 text-teal-700"
                : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          {step.isComplete ? "OK" : step.isCurrent ? "NOW" : ""}
        </span>
        {!isLast ? <span className="h-px flex-1 bg-slate-200 sm:hidden" /> : null}
      </div>
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold ${
            step.isCurrent ? "text-slate-900" : step.isComplete ? "text-teal-700" : "text-slate-500"
          }`}
        >
          {step.label}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {step.isCurrent ? "Current stage" : step.isComplete ? "Finished" : "Upcoming"}
        </p>
      </div>
    </div>
  );
}

function getDueState(request) {
  const endDate = new Date(request.endDate);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / msPerDay);

  if (Number.isNaN(diffDays)) {
    return { level: "normal", diffDays: null };
  }

  if (request.status === "completed") {
    return { level: "complete", diffDays };
  }

  if (request.status === "return_pending") {
    return { level: "pending", diffDays };
  }

  if (diffDays < 0) {
    return { level: "overdue", diffDays };
  }

  if (diffDays <= 2) {
    return { level: "urgent", diffDays };
  }

  return { level: "normal", diffDays };
}

function getDueSummary(request, dueState) {
  if (dueState.level === "complete") {
    return "Rental completed";
  }

  if (dueState.level === "pending") {
    return "Waiting for return confirmation";
  }

  if (dueState.diffDays == null) {
    return "End date available";
  }

  if (dueState.level === "overdue") {
    return `${Math.abs(dueState.diffDays)} day${Math.abs(dueState.diffDays) === 1 ? "" : "s"} overdue`;
  }

  if (dueState.diffDays === 0) {
    return "Due today";
  }

  return `${dueState.diffDays} day${dueState.diffDays === 1 ? "" : "s"} left`;
}

function getDueTone(level) {
  if (level === "overdue") {
    return "rental-timing-overdue";
  }

  if (level === "urgent") {
    return "rental-timing-urgent";
  }

  if (level === "pending") {
    return "rental-timing-pending";
  }

  if (level === "complete") {
    return "rental-timing-complete";
  }

  return "rental-timing-normal";
}

function getNextStepLabel(mode, request, canAct, actionLabel) {
  if (request.status === "approved") {
    return mode === "renter"
      ? {
          title: "Ready to start",
          detail: "The rental is approved and waiting to move into the active stage after the handoff."
        }
      : {
          title: "Waiting for renter to start",
          detail: "The reservation is approved. The renter still needs to move the rental forward from their side."
        };
  }

  if (request.status === "active") {
    return mode === "renter"
      ? {
          title: canAct ? actionLabel : "Rental in progress",
          detail: canAct
            ? "Use the return action once you are ready to hand the book back."
            : "Keep the rental active until you are ready to begin the return flow."
        }
      : {
          title: "Wait for return start",
          detail: "The book is still out. The next owner-side action begins only after the renter starts the return."
        };
  }

  if (request.status === "return_pending") {
    return mode === "renter"
      ? {
          title: "Waiting for owner confirmation",
          detail: "Your return was started successfully. The flow closes once the owner confirms receipt."
        }
      : {
          title: canAct ? actionLabel : "Check handback",
          detail: canAct
            ? "Confirm the return only after the book is physically back with you."
            : "The return flow is open. Verify the handback before closing the rental."
        };
  }

  return {
    title: "Rental completed",
    detail: "This rental has already finished successfully."
  };
}

function RentalLoadingCard() {
  return (
    <div className="request-card ui-card p-3.5 sm:p-4 lg:p-5 xl:p-6">
      <div className="request-card-layout">
        <div className="request-card-main xl:flex-[1.05]">
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
            <div className="ui-skeleton-pill w-24" />
            <div className="ui-skeleton-line w-full" />
            <div className="ui-skeleton-button w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
