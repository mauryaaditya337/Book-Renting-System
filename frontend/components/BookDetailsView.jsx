"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { getBookImages } from "@/lib/bookImages";
import { formatPrice, getAvailabilityTone, getListingPriceSummary, getListingType, toTitleCase } from "@/lib/books";

function normalizeWhatsAppPhoneNumber(phoneNumber = "") {
  return String(phoneNumber).replace(/[^\d]/g, "");
}

function buildWhatsAppUrl(phoneNumber, bookTitle, listingType) {
  const normalizedPhoneNumber = normalizeWhatsAppPhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber) {
    return "";
  }

  const intent =
    listingType === "sell"
      ? "buy"
      : listingType === "both"
        ? "rent or buy"
        : "rent";
  const message = encodeURIComponent(`Hi, I want to ${intent} your book: ${bookTitle}`);
  return `https://wa.me/${normalizedPhoneNumber}?text=${message}`;
}

export function BookDetailsView({ id }) {
  const { isAuthenticated, token, user } = useAuth();
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

      const listingType = getListingType(book);
      const ownerId = book.owner?.id || book.owner?._id || "";
      const currentUserId = user?.id || user?._id || "";
      const isOwnerViewingBook = Boolean(ownerId && currentUserId && ownerId === currentUserId);

      if (!isAuthenticated || !token || listingType === "sell" || isOwnerViewingBook) {
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
      } catch (error) {
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
    return (
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="h-80 animate-pulse rounded-[1.5rem] bg-slate-100" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        <h1 className="text-2xl font-semibold">Unable to load book details</h1>
        <p className="mt-2 text-sm leading-6">{errorMessage}</p>
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
  const ownerPhoneNumber = book.owner?.phoneNumber || book.owner?.phone || "";
  const meetupLocation = book.meetupLocation || "";
  const depositNote = book.depositNote || "";
  const normalizedOwnerPhoneNumber = normalizeWhatsAppPhoneNumber(ownerPhoneNumber);
  const ownerId = book.owner?.id || book.owner?._id || "";
  const currentUserId = user?.id || user?._id || "";
  const isOwnerViewingBook = Boolean(ownerId && currentUserId && ownerId === currentUserId);
  const whatsappUrl = buildWhatsAppUrl(ownerPhoneNumber, book.title, listingType);
  const shouldShowWhatsappButton =
    isAuthenticated &&
    !isOwnerViewingBook &&
    normalizedOwnerPhoneNumber.length >= 7 &&
    Boolean(whatsappUrl);
  const canRequestBook = listingType !== "sell";
  const requestStatus = ownRentalRequest?.status || "";
  const hasPendingRequest = requestStatus === "pending";
  const hasApprovedRequest = requestStatus === "approved";
  const hasActiveRequest = requestStatus === "active";
  const hasRejectedRequest = requestStatus === "rejected";
  const hasCompletedRequest = requestStatus === "completed";

  const handlePreviousImage = () => {
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  return (
    <section className="space-y-6">
      <Link href="/books" className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white">
        Back to books
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                {book.category}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {book.title}
              </h1>
              <p className="mt-3 text-base text-slate-600">by {book.author}</p>
            </div>
            <span
              className={`rounded-full border px-4 py-2 text-sm font-medium ${getAvailabilityTone(
                availabilityStatus
              )}`}
            >
              {toTitleCase(availabilityStatus)}
            </span>
          </div>

          <BookCover
            src={activeImage}
            title={book.title}
            ratioClassName="aspect-[16/10] sm:aspect-[5/4]"
            containerClassName="mt-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
          />

          {hasMultipleImages ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Image {activeImageIndex + 1} of {images.length}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePreviousImage}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoBlock label="ISBN" value={book.isbn || "Not provided"} />
            <InfoBlock label="Condition" value={book.condition} />
            <InfoBlock label={priceSummary.primaryLabel} value={priceSummary.primaryValue} />
            {priceSummary.secondaryLabel ? (
              <InfoBlock label={priceSummary.secondaryLabel} value={priceSummary.secondaryValue} />
            ) : null}
            {listingType !== "sell" ? (
              <InfoBlock label="Security deposit" value={formatPrice(book.securityDeposit)} />
            ) : null}
            <InfoBlock label="Location" value={book.location} />
            <InfoBlock label="Availability" value={toTitleCase(availabilityStatus)} />
            <InfoBlock label="Owner" value={ownerFullName} />
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Description
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{book.description}</p>
          </div>

          {meetupLocation || depositNote ? (
            <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Exchange Details
              </p>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                {meetupLocation ? <p>Meetup: {meetupLocation}</p> : null}
                {depositNote ? <p>Deposit: {depositNote}</p> : null}
              </div>
            </div>
          ) : null}
        </article>

        <aside className="rounded-[2rem] border border-white/60 bg-slate-900 p-6 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8">
          <h2 className="text-2xl font-semibold">Book summary</h2>
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-300">
              Owner Trust Info
            </p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              <SummaryRow label="Full name" value={ownerFullName} />
              <SummaryRow label="College name" value={ownerCollegeName} />
              {ownerCurrentDegree ? (
                <SummaryRow label="Current degree" value={ownerCurrentDegree} />
              ) : null}
              {ownerCity ? <SummaryRow label="City" value={ownerCity} /> : null}
            </div>
            {ownerBio ? (
              <div className="mt-3 rounded-2xl bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bio</p>
                <p className="mt-1 text-sm leading-6 text-slate-200">{ownerBio}</p>
              </div>
            ) : null}
          </div>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            <SummaryRow label="Owner name" value={ownerFullName} />
            <SummaryRow label="Owner email" value={book.owner?.email || "Unknown"} />
            <SummaryRow label="Listing" value={toTitleCase(listingType)} />
            <SummaryRow label="Pricing" value={priceSummary.inlineSummary} />
            <SummaryRow label="Pickup location" value={book.location} />
            {meetupLocation ? <SummaryRow label="Meetup" value={meetupLocation} /> : null}
            {depositNote ? <SummaryRow label="Deposit" value={depositNote} /> : null}
            <SummaryRow label="Availability" value={toTitleCase(availabilityStatus)} />
          </div>

          {(hasApprovedRequest || hasActiveRequest) && shouldShowWhatsappButton ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 block w-full rounded-2xl bg-emerald-600 px-5 py-3 text-center font-medium text-white transition hover:bg-emerald-500"
            >
              Contact on WhatsApp
            </a>
          ) : null}
          {canRequestBook ? (
            <>
              {hasPendingRequest ? (
                <>
                  <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-3 text-center font-medium text-amber-200">
                    Pending Approval
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Your request has been sent. WhatsApp contact will unlock only after the owner approves it.
                  </p>
                </>
              ) : hasRejectedRequest ? (
                <>
                  <div className="mt-8 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-center font-medium text-rose-200">
                    Request Rejected
                  </div>
                  {ownRentalRequest?.rejectionReason ? (
                    <div className="mt-4 rounded-2xl border border-rose-400/20 bg-white/5 px-5 py-3 text-sm leading-6 text-slate-300">
                      <p className="font-medium text-rose-200">Reason</p>
                      <p className="mt-1">{ownRentalRequest.rejectionReason}</p>
                    </div>
                  ) : null}
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    This request was rejected, so direct contact is still disabled.
                  </p>
                </>
              ) : hasApprovedRequest ? (
                <>
                  <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-center font-medium text-emerald-200">
                    Approved and Reserved
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Your request has been approved and this book is now reserved for you. Start the rent from My Requests when you pick it up.
                  </p>
                </>
              ) : hasActiveRequest ? (
                <>
                  <div className="mt-8 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-5 py-3 text-center font-medium text-sky-200">
                    Rental Active
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    This rental is currently active. You can coordinate with the owner on WhatsApp and return it from My Requests when you are done.
                  </p>
                </>
              ) : hasCompletedRequest ? (
                <>
                  <div className="mt-8 rounded-2xl border border-teal-400/30 bg-teal-500/10 px-5 py-3 text-center font-medium text-teal-200">
                    Rental Completed
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Your previous rental for this book has been completed. If the book is available again, you can send a new request.
                  </p>
                </>
              ) : (
                <>
                  <Link
                    href={
                      isAuthenticated
                        ? `/books/${book.id}/request`
                        : `/login?redirect=${encodeURIComponent(`/books/${book.id}/request`)}`
                    }
                    aria-disabled={!isRequestAvailable || isLoadingOwnRequest}
                    className={`mt-8 block w-full rounded-2xl px-5 py-3 text-center font-medium transition ${
                      isRequestAvailable && !isLoadingOwnRequest
                        ? "bg-teal-600 text-white hover:bg-teal-500"
                        : "pointer-events-none bg-slate-700 text-slate-400"
                    }`}
                  >
                    {isLoadingOwnRequest
                      ? "Checking request status..."
                      : isRequestAvailable
                        ? "Request This Book"
                        : "Currently Unavailable"}
                  </Link>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {isAuthenticated
                      ? "Choose rental dates and submit your request first. WhatsApp contact appears only after approval."
                      : "Log in first and you can continue directly into the request form."}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm leading-6 text-slate-300">
              This listing is for sale only, so buyers should contact the owner directly.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}
