"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { SavedBookButton } from "@/components/SavedBookButton";
import { apiRequest } from "@/lib/api";
import { saveCurrentLocationForLoginRedirect } from "@/lib/authRedirect";
import { getBookImages } from "@/lib/bookImages";
import {
  formatPrice,
  getAvailabilityTone,
  getListingPriceSummary,
  getListingType,
  toTitleCase
} from "@/lib/books";

export function BookDetailsView({ id }) {
  const { isAuthenticated, token, user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [ownRentalRequest, setOwnRentalRequest] = useState(null);
  const [isLoadingOwnRequest, setIsLoadingOwnRequest] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadBook() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/books/${id}`, {
          cache: "no-store"
        });

        if (isActive) {
          setBook(data.book);
          setActiveImageIndex(0);
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

    loadBook();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    let isActive = true;

    async function loadOwnRentalRequest() {
      if (!book) {
        setOwnRentalRequest(null);
        setIsLoadingOwnRequest(false);
        return;
      }

      const ownerId = book.owner?.id || book.owner?._id || "";
      const currentUserId = user?.id || user?._id || "";
      const isOwnerViewingBook = Boolean(ownerId && currentUserId && ownerId === currentUserId);

      if (!isAuthenticated || !token || isOwnerViewingBook) {
        setOwnRentalRequest(null);
        setIsLoadingOwnRequest(false);
        return;
      }

      setIsLoadingOwnRequest(true);

      try {
        const data = await apiRequest(`/rent-requests/book/${id}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isActive) {
          setOwnRentalRequest(data.rentalRequest || null);
        }
      } catch (_error) {
        if (isActive) {
          setOwnRentalRequest(null);
        }
      } finally {
        if (isActive) {
          setIsLoadingOwnRequest(false);
        }
      }
    }

    loadOwnRentalRequest();

    return () => {
      isActive = false;
    };
  }, [book, id, isAuthenticated, token, user]);

  if (isLoading) {
    return <BookDetailsLoadingState />;
  }

  if (errorMessage) {
    return (
      <div className="ui-feedback-error ui-feedback-panel">
        <h1 className="ui-feedback-title text-2xl">Unable to load book details</h1>
        <p className="ui-feedback-body">{errorMessage}</p>
        <Link href="/books" className="mt-5 inline-flex text-sm font-medium text-red-700 underline">
          Back to books
        </Link>
      </div>
    );
  }

  if (!book) {
    return null;
  }

  const availabilityStatus = book.availabilityStatus || "available";
  const isRequestAvailable = availabilityStatus === "available";
  const images = getBookImages(book);
  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeImageIndex] || "";
  const listingType = getListingType(book);
  const priceSummary = getListingPriceSummary(book);
  const ownerFullName = book.owner?.fullName || book.owner?.name || "Unknown";
  const ownerCollegeName = book.owner?.collegeName || "Not shared yet";
  const ownerCurrentDegree = book.owner?.currentDegree || "";
  const ownerCity = book.owner?.city || "";
  const ownerBio = book.owner?.bio || "";
  const meetupLocation = book.meetupLocation || "";
  const depositNote = book.depositNote || "";
  const requestStatus = ownRentalRequest?.status || "";
  const hasPendingRequest = requestStatus === "pending";
  const hasApprovedRequest = requestStatus === "approved";
  const hasActiveRequest = requestStatus === "active";
  const hasReturnPendingRequest = requestStatus === "return_pending";
  const hasRejectedRequest = requestStatus === "rejected";
  const hasCompletedRequest = requestStatus === "completed";
  const canRequestAgain = hasRejectedRequest || hasCompletedRequest;
  const ownerTrustLine = [ownerCollegeName, ownerCurrentDegree, ownerCity].filter(Boolean).join(" • ");

  const handlePreviousImage = () => {
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  const handleLoginRedirect = () => {
    saveCurrentLocationForLoginRedirect();
    router.push("/login");
  };

  return (
    <section className="space-y-6">
      <Link href="/books" className="ui-btn-light w-full rounded-full px-4 py-2 sm:w-auto">
        Back to books
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <article className="ui-surface overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="border-b border-slate-200/70 bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(255,255,255,0.72))] p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="relative">
                <BookCover
                  src={activeImage}
                  title={book.title}
                  ratioClassName="aspect-[4/5]"
                  containerClassName="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(15,23,42,0.08))] shadow-[0_28px_70px_rgba(15,23,42,0.18)]"
                  imageClassName="object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-[2rem] bg-gradient-to-t from-slate-950/20 via-slate-900/8 to-transparent" />
              </div>

              {hasMultipleImages ? (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-600">
                      Image {activeImageIndex + 1} of {images.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handlePreviousImage}
                        className="ui-btn-secondary min-h-11 px-4 py-2"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="ui-btn-dark min-h-11 px-4 py-2"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`overflow-hidden rounded-[1rem] border transition ${
                          index === activeImageIndex
                            ? "border-slate-900 shadow-sm"
                            : "border-white/80 hover:border-slate-300"
                        }`}
                      >
                        <BookCover
                          src={image}
                          title={`${book.title} ${index + 1}`}
                          ratioClassName="aspect-[4/5]"
                          containerClassName="rounded-[1rem] border-0 bg-white"
                          imageClassName="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-700">
                      {book.category}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      {toTitleCase(listingType)}
                    </span>
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                    {book.title}
                  </h1>
                  <p className="mt-3 text-base text-slate-600 sm:text-lg">by {book.author}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <SavedBookButton book={book} showLabel className="w-full justify-center sm:w-auto" />
                  <span
                    className={`request-status-pill inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold ${getAvailabilityTone(
                      availabilityStatus
                    )}`}
                  >
                    {toTitleCase(availabilityStatus)}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <HeroMeta label="Condition" value={book.condition || "Not provided"} />
                <HeroMeta label="ISBN" value={book.isbn || "Not provided"} />
                <HeroMeta label="Location" value={book.location || "Not provided"} />
                <HeroMeta label="Owner" value={ownerFullName} />
              </div>

              <div className="ui-trust-band mt-6">
                <div className="flex flex-wrap gap-2">
                  <span className="ui-trust-chip">{toTitleCase(listingType)} listing</span>
                  <span className="ui-trust-chip">{book.condition || "Condition not shared"}</span>
                  <span className="ui-trust-chip">{toTitleCase(availabilityStatus)}</span>
                </div>
                <p className="ui-trust-copy">
                  Listed by {ownerFullName}
                  {ownerTrustLine ? ` • ${ownerTrustLine}` : ""}. Use the request flow first so the
                  owner can review availability before handoff.
                </p>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(155deg,rgba(15,118,110,0.1),rgba(255,255,255,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                      {priceSummary.primaryLabel}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.3rem]">
                      {priceSummary.primaryValue}
                    </p>
                  </div>
                  {!listingType || listingType !== "sell" ? (
                    <div className="rounded-[1.25rem] border border-white/90 bg-white/90 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Security deposit
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatPrice(book.securityDeposit)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {priceSummary.approxDailyLabel ? (
                    <InfoBlock label={priceSummary.approxDailyLabel} value={priceSummary.approxDailyValue} />
                  ) : null}
                  {priceSummary.secondaryLabel ? (
                    <InfoBlock label={priceSummary.secondaryLabel} value={priceSummary.secondaryValue} />
                  ) : (
                    <InfoBlock label="Availability" value={toTitleCase(availabilityStatus)} />
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-slate-50/86 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Next Step
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Request and reserve this listing</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Review the pricing and location, then continue into the request flow when you are ready.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[15rem]">
                    <RequestActionArea
                      isAuthenticated={isAuthenticated}
                      isLoadingOwnRequest={isLoadingOwnRequest}
                      isRequestAvailable={isRequestAvailable}
                      bookId={book.id}
                      listingType={listingType}
                      handleLoginRedirect={handleLoginRedirect}
                      hasPendingRequest={hasPendingRequest}
                      hasRejectedRequest={hasRejectedRequest}
                      hasApprovedRequest={hasApprovedRequest}
                      hasActiveRequest={hasActiveRequest}
                      hasReturnPendingRequest={hasReturnPendingRequest}
                      hasCompletedRequest={hasCompletedRequest}
                      canRequestAgain={canRequestAgain}
                      ownRentalRequest={ownRentalRequest}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="ui-card p-5 sm:p-6">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Owner & Listing
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Trust and listing context</h2>
            <div className="ui-trust-card mt-5">
              <p className="ui-trust-label">Why this matters</p>
              <p className="ui-trust-copy">
                Ownership, pickup details, and request approval all stay visible here so you can
                decide with more confidence before sending a request.
              </p>
            </div>
            <div className="mt-5 space-y-3">
              <InfoBlock label="Owner name" value={ownerFullName} />
              <InfoBlock label="College name" value={ownerCollegeName} />
              {ownerCurrentDegree ? <InfoBlock label="Current degree" value={ownerCurrentDegree} /> : null}
              <InfoBlock label="Listing type" value={toTitleCase(listingType)} />
            </div>
            {ownerBio ? (
              <div className="mt-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/88 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bio</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{ownerBio}</p>
              </div>
            ) : null}
          </div>

          <div className="ui-card p-5 sm:p-6">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Location & Exchange
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Pickup clarity</h2>
            <div className="mt-5 space-y-3">
              <InfoBlock label="City / area" value={book.location || "Not provided"} />
              {ownerCity ? <InfoBlock label="Owner city" value={ownerCity} /> : null}
              {meetupLocation ? <InfoBlock label="Meetup point" value={meetupLocation} /> : null}
              {depositNote ? <InfoBlock label="Deposit note" value={depositNote} /> : null}
            </div>
          </div>

          <div className="ui-card p-5 sm:p-6">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Description
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">What to expect</h2>
            <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/86 p-4 sm:p-5">
              <p className="text-sm leading-7 text-slate-700">
                {book.description || "No description shared for this listing yet."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RequestActionArea({
  isAuthenticated,
  isLoadingOwnRequest,
  isRequestAvailable,
  bookId,
  listingType,
  handleLoginRedirect,
  hasPendingRequest,
  hasRejectedRequest,
  hasApprovedRequest,
  hasActiveRequest,
  hasReturnPendingRequest,
  hasCompletedRequest,
  canRequestAgain,
  ownRentalRequest
}) {
  if (hasPendingRequest) {
    return (
      <>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">
          Pending Approval
        </div>
        <div className="ui-trust-card">
          <p className="ui-trust-label">What happens next</p>
          <p className="ui-trust-copy">
            The owner reviews your request first. Nothing starts until they approve it.
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Your request has been sent. The owner will review it before taking the next step.
        </p>
      </>
    );
  }

  if (hasRejectedRequest) {
    return (
      <>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700">
          Request Rejected
        </div>
        {ownRentalRequest?.rejectionReason ? (
          <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-rose-700">Reason</p>
            <p className="mt-1">{ownRentalRequest.rejectionReason}</p>
          </div>
        ) : null}
        <div className="ui-trust-card">
          <p className="ui-trust-label">What happens next</p>
          <p className="ui-trust-copy">
            Review the owner feedback first, then send a fresh request only if this listing becomes
            available again.
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          This request was rejected. You can send a fresh request if this book is available again.
        </p>
        <ActionButton
          isAuthenticated={isAuthenticated}
          handleLoginRedirect={handleLoginRedirect}
          href={`/books/${bookId}/request`}
          disabled={!isRequestAvailable || isLoadingOwnRequest}
        >
          {isLoadingOwnRequest ? "Checking request status..." : isRequestAvailable ? "Request Again" : "Currently Unavailable"}
        </ActionButton>
      </>
    );
  }

  if (hasApprovedRequest) {
    return (
      <>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          {listingType === "sell" ? "Purchase Request Approved" : "Approved and Reserved"}
        </div>
        <div className="ui-trust-card">
          <p className="ui-trust-label">Next step</p>
          <p className="ui-trust-copy">
            {listingType === "sell"
              ? "Approval means the seller is ready to coordinate the purchase handoff."
              : "Approval reserves the book for you, but the rental begins only when you start it."}
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {listingType === "sell"
            ? "Your request has been approved. The seller can now contact you from their incoming requests screen."
            : "Your request has been approved and this book is now reserved for you. Start the rent from My Requests when you pick it up."}
        </p>
      </>
    );
  }

  if (hasActiveRequest) {
    return (
      <>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm font-semibold text-sky-700">
          Rental Active
        </div>
        <div className="ui-trust-card">
          <p className="ui-trust-label">Keep in mind</p>
          <p className="ui-trust-copy">
            Use the return flow when you are done so the owner can confirm completion on their side.
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          This rental is currently active. You can coordinate with the owner and return it from My Requests when you are done.
        </p>
      </>
    );
  }

  if (hasReturnPendingRequest) {
    return (
      <>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center text-sm font-semibold text-indigo-700">
          Return Pending
        </div>
        <div className="ui-trust-card">
          <p className="ui-trust-label">Waiting for confirmation</p>
          <p className="ui-trust-copy">
            Your part is complete. The owner still needs to confirm the handback to close the flow.
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          You have asked to return this book. The owner still needs to confirm the return before the rental is marked completed.
        </p>
      </>
    );
  }

  if (hasCompletedRequest) {
    return (
      <>
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-center text-sm font-semibold text-teal-700">
          Rental Completed
        </div>
        <div className="ui-trust-card">
          <p className="ui-trust-label">Status confirmed</p>
          <p className="ui-trust-copy">
            This request is fully closed out, so future requests start from a clean state.
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Your previous rental for this book has been completed. You can request it again whenever the book is available.
        </p>
        {canRequestAgain ? (
          <ActionButton
            isAuthenticated={isAuthenticated}
            handleLoginRedirect={handleLoginRedirect}
            href={`/books/${bookId}/request`}
            disabled={!isRequestAvailable || isLoadingOwnRequest}
          >
            {isLoadingOwnRequest ? "Checking request status..." : isRequestAvailable ? "Request Again" : "Currently Unavailable"}
          </ActionButton>
        ) : null}
      </>
    );
  }

  return (
    <>
      <ActionButton
        isAuthenticated={isAuthenticated}
        handleLoginRedirect={handleLoginRedirect}
        href={`/books/${bookId}/request`}
        disabled={!isRequestAvailable || isLoadingOwnRequest}
      >
        {isLoadingOwnRequest ? "Checking request status..." : isRequestAvailable ? "Request This Book" : "Currently Unavailable"}
      </ActionButton>
      <div className="ui-trust-card">
        <p className="ui-trust-label">How the flow works</p>
        <p className="ui-trust-copy">
          Requests are reviewed first, then approval or rental actions happen step by step inside
          the app.
        </p>
      </div>
      <p className="text-sm leading-6 text-slate-600">
        {isAuthenticated
          ? listingType === "sell"
            ? "Send a purchase request first. The seller can approve or reject it from incoming requests."
            : "Choose rental dates and submit your request first. The owner will review it before anything else happens."
          : "Log in first and you can continue directly into the request form."}
      </p>
    </>
  );
}

function ActionButton({ isAuthenticated, handleLoginRedirect, href, disabled, children }) {
  if (isAuthenticated) {
    return (
      <Link
        href={href}
        aria-disabled={disabled}
        className={`ui-btn-primary w-full ${disabled ? "pointer-events-none bg-slate-300 text-slate-500 shadow-none" : ""}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLoginRedirect}
      disabled={disabled}
      className={`ui-btn-primary w-full ${disabled ? "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none hover:translate-y-0" : ""}`}
    >
      {children}
    </button>
  );
}

function HeroMeta({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/86 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function BookDetailsLoadingState() {
  return (
    <section className="space-y-6">
      <div className="ui-skeleton-button w-36" />

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="ui-surface overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="border-b border-slate-200/70 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="ui-skeleton h-[28rem] rounded-[2rem]" />
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="ui-skeleton h-20 rounded-[1rem]" />
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="ui-skeleton-pill w-24" />
                    <div className="ui-skeleton-pill w-20" />
                  </div>
                  <div className="ui-skeleton-title w-4/5" />
                  <div className="ui-skeleton-line w-2/3" />
                </div>
                <div className="ui-skeleton-pill w-28" />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="ui-skeleton-panel space-y-2">
                    <div className="ui-skeleton-line w-20" />
                    <div className="ui-skeleton-line w-28" />
                  </div>
                ))}
              </div>

              <div className="ui-skeleton-panel mt-6 space-y-4 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <div className="ui-skeleton-line w-24" />
                    <div className="ui-skeleton-title w-36" />
                  </div>
                  <div className="ui-skeleton h-20 w-full rounded-[1.25rem] sm:w-40" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ui-skeleton h-20 rounded-[1.2rem]" />
                  <div className="ui-skeleton h-20 rounded-[1.2rem]" />
                </div>
              </div>

              <div className="ui-skeleton-panel mt-6 space-y-4 p-5 sm:p-6">
                <div className="space-y-2">
                  <div className="ui-skeleton-line w-24" />
                  <div className="ui-skeleton-title w-56" />
                  <div className="ui-skeleton-line w-full" />
                </div>
                <div className="space-y-3">
                  <div className="ui-skeleton-button w-full" />
                  <div className="ui-skeleton-line w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="ui-skeleton-card space-y-4">
              <div className="ui-skeleton-line w-24" />
              <div className="ui-skeleton-title w-2/3" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="ui-skeleton h-20 rounded-[1.3rem]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
