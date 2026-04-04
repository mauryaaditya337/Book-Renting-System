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
import { canOpenChat, getChatHref } from "@/lib/chats";
import { buildWhatsAppUrl, canUseWhatsApp } from "@/lib/contact";
import { enrichBookWithDistance, getStoredUserLocation, requestBrowserLocation } from "@/lib/location";
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
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const storedLocation = getStoredUserLocation();

    if (storedLocation) {
      setUserLocation(storedLocation);
    }

    requestBrowserLocation()
      .then((currentLocation) => {
        setUserLocation(currentLocation);
      })
      .catch(() => {});
  }, []);

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

  const displayBook = enrichBookWithDistance(book, userLocation);

  const availabilityStatus = displayBook.availabilityStatus || "available";
  const isRequestAvailable = availabilityStatus === "available";
  const images = getBookImages(displayBook);
  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeImageIndex] || "";
  const listingType = getListingType(displayBook);
  const priceSummary = getListingPriceSummary(displayBook);
  const ownerFullName = displayBook.owner?.fullName || displayBook.owner?.name || "Unknown";
  const ownerCollegeName = displayBook.owner?.collegeName || "Not shared yet";
  const ownerCurrentDegree = displayBook.owner?.currentDegree || "";
  const ownerCity = displayBook.owner?.city || "";
  const ownerBio = displayBook.owner?.bio || "";
  const meetupLocation = displayBook.meetupLocation || "";
  const depositNote = displayBook.depositNote || "";
  const pickupLocationName = displayBook.pickupLocationName || "";
  const requestStatus = ownRentalRequest?.status || "";
  const hasPendingRequest = requestStatus === "pending";
  const hasApprovedRequest = requestStatus === "approved";
  const hasActiveRequest = requestStatus === "active";
  const hasReturnPendingRequest = requestStatus === "return_pending";
  const hasRejectedRequest = requestStatus === "rejected";
  const hasCompletedRequest = requestStatus === "completed";
  const canRequestAgain = hasRejectedRequest || hasCompletedRequest;
  const ownerTrustLine = [ownerCollegeName, ownerCurrentDegree, ownerCity].filter(Boolean).join(" - ");
  const primaryCtaLabel = listingType === "sell" ? "Buy Book" : "Request Book";
  const stickyPriceLabel = listingType === "sell" ? "One-time price" : "Per day";
  const stickyPriceValue = priceSummary.approxDailyValue || priceSummary.primaryValue;
  const detailChips = [
    displayBook.category,
    displayBook.condition || "Condition not shared",
    pickupLocationName || meetupLocation || displayBook.location,
    displayBook.distance || displayBook.distanceText || ""
  ].filter(Boolean);

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

  const handleBackNavigation = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/books");
  };

  return (
    <section className="book-details-page mx-auto w-full max-w-6xl overflow-x-clip pb-32 xl:pb-10">
      <div className="mb-4 hidden xl:block">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="book-details-back-button"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ←
          </span>
          <span>Back</span>
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(18.5rem,0.52fr)] xl:gap-6 xl:items-start">
        <article className="ui-surface overflow-hidden p-0">
          <div className="book-details-hero p-4 sm:p-6 xl:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)] xl:gap-8 xl:items-start">
              <div className="min-w-0">
                <div className="relative mx-auto w-full max-w-sm xl:max-w-none">
                  <button
                    type="button"
                    onClick={handleBackNavigation}
                    className="book-details-mobile-back-button xl:hidden"
                    aria-label="Go back"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      ←
                    </span>
                  </button>
                  <BookCover
                    src={activeImage}
                    title={book.title}
                    ratioClassName="aspect-[5/6]"
                    containerClassName="book-details-cover rounded-[2rem] border-white/70 bg-white/65 shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
                    imageClassName="object-cover"
                  />
                </div>

                {hasMultipleImages ? (
                  <div className="mt-4 space-y-3 xl:mt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-600">
                        Image {activeImageIndex + 1} of {images.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePreviousImage}
                          className="ui-btn-secondary min-h-10 px-3 py-2"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={handleNextImage}
                          className="ui-btn-dark min-h-10 px-3 py-2"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 xl:grid-cols-4">
                      {images.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`book-details-thumb min-w-0 overflow-hidden rounded-[1rem] border transition ${
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

              <div className="book-details-main-copy min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3 xl:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700 shadow-sm">
                        {toTitleCase(listingType)} listing
                      </span>
                      <span
                        className={`request-status-pill inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${getAvailabilityTone(
                          availabilityStatus
                        )}`}
                      >
                        {toTitleCase(availabilityStatus)}
                      </span>
                    </div>

                    <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl xl:max-w-[12ch] xl:text-[2.8rem] xl:leading-[1.05]">
                      {book.title}
                    </h1>
                    <p className="mt-2 text-base text-slate-600 sm:text-lg xl:text-[1.05rem]">by {book.author}</p>
                  </div>

                  <SavedBookButton
                    book={book}
                    showLabel
                    className="w-full justify-center md:w-auto xl:self-start"
                  />
                </div>

                {detailChips.length ? (
                  <div className="mt-5 flex flex-wrap gap-2 xl:mt-6">
                    {detailChips.map((chip) => (
                      <span key={chip} className="ui-trust-chip max-w-full truncate">
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:mt-7 xl:gap-4">
                  <HeroMeta label="Condition" value={displayBook.condition || "Not provided"} />
                  <HeroMeta label="Location" value={displayBook.location || "Not provided"} />
                  <HeroMeta label="Category" value={displayBook.category || "Not provided"} />
                  <HeroMeta label="Owner" value={ownerFullName} />
                  {displayBook.isbn ? <HeroMeta label="ISBN" value={displayBook.isbn} /> : null}
                  {pickupLocationName ? <HeroMeta label="Pickup point" value={pickupLocationName} /> : null}
                  {displayBook.distance || displayBook.distanceText ? (
                    <HeroMeta label="Distance" value={displayBook.distance || displayBook.distanceText} />
                  ) : null}
                </div>

                <div className="book-details-price-panel mt-6 rounded-[1.6rem] border border-slate-200/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] sm:p-5 xl:hidden">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {priceSummary.primaryLabel}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        {priceSummary.primaryValue}
                      </p>
                    </div>

                    {!listingType || listingType !== "sell" ? (
                      <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Security deposit
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
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

                <div className="ui-trust-band mt-6 xl:hidden">
                  <p className="ui-trust-label">Listing snapshot</p>
                  <p className="ui-trust-copy">
                    Listed by {ownerFullName}
                    {ownerTrustLine ? ` - ${ownerTrustLine}` : ""}. Review the details here, then use the
                    request flow below when you are ready.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden border-t border-slate-200/70 bg-white/60 xl:block">
            <div className="book-details-summary-band p-8">
              <div className="book-details-price-panel rounded-[1.7rem] border border-slate-200/80 bg-white/72 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {priceSummary.primaryLabel}
                    </p>
                    <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-900">
                      {priceSummary.primaryValue}
                    </p>
                  </div>

                  {!listingType || listingType !== "sell" ? (
                    <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Security deposit
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {formatPrice(book.securityDeposit)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-2">
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

              <div className="ui-trust-band h-full">
                <p className="ui-trust-label">Listing snapshot</p>
                <p className="ui-trust-copy">
                  Listed by {ownerFullName}
                  {ownerTrustLine ? ` - ${ownerTrustLine}` : ""}. Review the details here, then use the
                  request flow below when you are ready.
                </p>
                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                  <InfoBlock label="Listing type" value={toTitleCase(listingType)} />
                  <InfoBlock label="Location" value={displayBook.location || "Not provided"} />
                  {pickupLocationName ? <InfoBlock label="Pickup location" value={pickupLocationName} /> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-200/70 bg-white/55 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-5 xl:p-8">
            <div className="ui-card p-5 sm:p-6 lg:row-span-2">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Description</p>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {book.description || "No description shared for this listing yet."}
              </p>
            </div>

            <div className="ui-card p-5 sm:p-6">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Owner</p>
              <div className="mt-4 space-y-3">
                <InfoBlock label="Owner name" value={ownerFullName} />
                <InfoBlock label="College name" value={ownerCollegeName} />
                {ownerCurrentDegree ? <InfoBlock label="Current degree" value={ownerCurrentDegree} /> : null}
                {ownerBio ? <InfoBlock label="Bio" value={ownerBio} /> : null}
              </div>
            </div>

            <div className="ui-card p-5 sm:p-6">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Exchange details</p>
              <div className="mt-4 space-y-3">
                <InfoBlock label="Listing type" value={toTitleCase(listingType)} />
                <InfoBlock label="City / area" value={displayBook.location || "Not provided"} />
                {pickupLocationName ? <InfoBlock label="Pickup point" value={pickupLocationName} /> : null}
                {ownerCity ? <InfoBlock label="Owner city" value={ownerCity} /> : null}
                {meetupLocation ? <InfoBlock label="Meetup point" value={meetupLocation} /> : null}
                {displayBook.distance || displayBook.distanceText ? (
                  <InfoBlock label="Distance" value={displayBook.distance || displayBook.distanceText} />
                ) : null}
                {depositNote ? <InfoBlock label="Deposit note" value={depositNote} /> : null}
              </div>
            </div>

            <div className="ui-card p-5 sm:p-6 lg:col-span-2">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Request details</p>
              <div className="mt-4">
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
                  defaultActionLabel={primaryCtaLabel}
                />
              </div>
            </div>
          </div>
        </article>

        <aside className="hidden xl:block">
          <div className="book-details-sticky-bar">
            <div className="space-y-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Ready to continue
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {primaryCtaLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {listingType === "sell"
                    ? "A clear purchase handoff starts with the same request flow already in place."
                    : "Keep the price visible while you review details, owner info, and pickup context."}
                </p>
              </div>

              <div className="book-details-side-summary">
                <InfoBlock label={stickyPriceLabel} value={stickyPriceValue} />
                <InfoBlock label="Owner" value={ownerFullName} />
              </div>
            </div>

            <div className="book-details-side-cta w-full">
              <ActionButton
                isAuthenticated={isAuthenticated}
                handleLoginRedirect={handleLoginRedirect}
                href={`/books/${book.id}/request`}
                disabled={!isRequestAvailable || isLoadingOwnRequest}
              >
                {isLoadingOwnRequest
                  ? "Checking request status..."
                  : isRequestAvailable
                    ? primaryCtaLabel
                    : "Currently Unavailable"}
              </ActionButton>
            </div>
          </div>
        </aside>
      </div>

      <div className="book-details-mobile-bar xl:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {stickyPriceLabel}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-slate-900">{stickyPriceValue}</p>
        </div>

        <div className="min-w-0 flex-1">
          <ActionButton
            isAuthenticated={isAuthenticated}
            handleLoginRedirect={handleLoginRedirect}
            href={`/books/${book.id}/request`}
            disabled={!isRequestAvailable || isLoadingOwnRequest}
          >
            {isLoadingOwnRequest
              ? "Checking..."
              : isRequestAvailable
                ? primaryCtaLabel
                : "Unavailable"}
          </ActionButton>
        </div>
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
  ownRentalRequest,
  defaultActionLabel
}) {
  const canShowCommunicationActions = canOpenChat(ownRentalRequest);
  const ownerPhoneNumber = ownRentalRequest?.owner?.phoneNumber || "";
  const canShowWhatsappFallback = canShowCommunicationActions && canUseWhatsApp(ownerPhoneNumber);
  const whatsappUrl = canShowWhatsappFallback
    ? buildWhatsAppUrl(ownerPhoneNumber, ownRentalRequest?.book?.title || "this request")
    : "";

  if (hasPendingRequest) {
    return (
      <div className="space-y-3">
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
      </div>
    );
  }

  if (hasRejectedRequest) {
    return (
      <div className="space-y-3">
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
        <ActionButton
          isAuthenticated={isAuthenticated}
          handleLoginRedirect={handleLoginRedirect}
          href={`/books/${bookId}/request`}
          disabled={!isRequestAvailable || isLoadingOwnRequest}
        >
          {isLoadingOwnRequest ? "Checking request status..." : isRequestAvailable ? "Request Again" : "Currently Unavailable"}
        </ActionButton>
      </div>
    );
  }

  if (hasApprovedRequest) {
    return (
      <div className="space-y-3">
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
        <CommunicationActions
          canShowCommunicationActions={canShowCommunicationActions}
          chatHref={getChatHref(ownRentalRequest)}
          canShowWhatsappFallback={canShowWhatsappFallback}
          whatsappUrl={whatsappUrl}
        />
      </div>
    );
  }

  if (hasActiveRequest) {
    return (
      <div className="space-y-3">
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
        <CommunicationActions
          canShowCommunicationActions={canShowCommunicationActions}
          chatHref={getChatHref(ownRentalRequest)}
          canShowWhatsappFallback={canShowWhatsappFallback}
          whatsappUrl={whatsappUrl}
        />
      </div>
    );
  }

  if (hasReturnPendingRequest) {
    return (
      <div className="space-y-3">
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
        <CommunicationActions
          canShowCommunicationActions={canShowCommunicationActions}
          chatHref={getChatHref(ownRentalRequest)}
          canShowWhatsappFallback={canShowWhatsappFallback}
          whatsappUrl={whatsappUrl}
        />
      </div>
    );
  }

  if (hasCompletedRequest) {
    return (
      <div className="space-y-3">
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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ActionButton
        isAuthenticated={isAuthenticated}
        handleLoginRedirect={handleLoginRedirect}
        href={`/books/${bookId}/request`}
        disabled={!isRequestAvailable || isLoadingOwnRequest}
      >
        {isLoadingOwnRequest ? "Checking request status..." : isRequestAvailable ? defaultActionLabel : "Currently Unavailable"}
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
    </div>
  );
}

function CommunicationActions({
  canShowCommunicationActions,
  chatHref,
  canShowWhatsappFallback,
  whatsappUrl
}) {
  if (!canShowCommunicationActions) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Link href={chatHref} className="ui-btn-primary w-full">
        Open Chat
      </Link>
      <p className="px-1 text-xs leading-5 text-slate-500">Use in-app chat for coordination.</p>
      {canShowWhatsappFallback ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="ui-btn-secondary block w-full px-4 py-2 text-center text-sm"
        >
          WhatsApp
        </a>
      ) : null}
    </div>
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
    <div className="min-w-0 rounded-[1.25rem] border border-slate-200/80 bg-white/86 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="min-w-0 rounded-[1.35rem] border border-slate-200/80 bg-slate-50/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function BookDetailsLoadingState() {
  return (
    <section className="mx-auto w-full max-w-6xl overflow-x-clip pb-32 xl:pb-10">
      <div className="ui-surface overflow-hidden p-0">
        <div className="p-4 sm:p-6 xl:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1fr)]">
            <div>
              <div className="ui-skeleton h-[24rem] rounded-[2rem] sm:h-[30rem]" />
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="ui-skeleton h-20 rounded-[1rem]" />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="ui-skeleton-pill w-24" />
                <div className="ui-skeleton-pill w-24" />
              </div>
              <div className="ui-skeleton-title w-4/5" />
              <div className="ui-skeleton-line w-2/3" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="ui-skeleton-panel space-y-2">
                    <div className="ui-skeleton-line w-20" />
                    <div className="ui-skeleton-line w-full" />
                  </div>
                ))}
              </div>
              <div className="ui-skeleton-panel space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="space-y-2">
                    <div className="ui-skeleton-line w-24" />
                    <div className="ui-skeleton-title w-40" />
                  </div>
                  <div className="ui-skeleton h-16 w-36 rounded-[1.25rem]" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ui-skeleton h-20 rounded-[1.2rem]" />
                  <div className="ui-skeleton h-20 rounded-[1.2rem]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200/70 bg-white/55 p-4 sm:p-6 lg:grid-cols-2 xl:p-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ui-skeleton-card space-y-4">
              <div className="ui-skeleton-line w-28" />
              <div className="space-y-3">
                <div className="ui-skeleton-line w-full" />
                <div className="ui-skeleton-line w-11/12" />
                <div className="ui-skeleton-line w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
