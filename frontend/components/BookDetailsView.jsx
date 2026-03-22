"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { getBookImages } from "@/lib/bookImages";
import { formatPrice, getAvailabilityTone, toTitleCase } from "@/lib/books";

export function BookDetailsView({ id }) {
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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

  const isRequestAvailable = book.availabilityStatus === "available";
  const images = getBookImages(book);
  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeImageIndex] || "";

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
                book.availabilityStatus
              )}`}
            >
              {toTitleCase(book.availabilityStatus)}
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
            <InfoBlock label="Rental price" value={formatPrice(book.rentalPrice)} />
            <InfoBlock label="Security deposit" value={formatPrice(book.securityDeposit)} />
            <InfoBlock label="Location" value={book.location} />
            <InfoBlock label="Owner" value={book.owner?.name || "Unknown"} />
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Description
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{book.description}</p>
          </div>
        </article>

        <aside className="rounded-[2rem] border border-white/60 bg-slate-900 p-6 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8">
          <h2 className="text-2xl font-semibold">Book summary</h2>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            <SummaryRow label="Owner name" value={book.owner?.name || "Unknown"} />
            <SummaryRow label="Owner email" value={book.owner?.email || "Unknown"} />
            <SummaryRow label="Pickup location" value={book.location} />
            <SummaryRow label="Availability" value={toTitleCase(book.availabilityStatus)} />
          </div>

          <button
            type="button"
            disabled
            className="hidden"
          >
          </button>
          <Link
            href={
              isAuthenticated
                ? `/books/${book.id}/request`
                : `/login?redirect=${encodeURIComponent(`/books/${book.id}/request`)}`
            }
            aria-disabled={!isRequestAvailable}
            className={`mt-8 block w-full rounded-2xl px-5 py-3 text-center font-medium transition ${
              isRequestAvailable
                ? "bg-teal-600 text-white hover:bg-teal-500"
                : "pointer-events-none bg-slate-700 text-slate-400"
            }`}
          >
            {isRequestAvailable ? "Request This Book" : "Currently Unavailable"}
          </Link>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            {isAuthenticated
              ? "Choose rental dates and submit your request from the next screen."
              : "Log in first and you can continue directly into the request form."}
          </p>
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
