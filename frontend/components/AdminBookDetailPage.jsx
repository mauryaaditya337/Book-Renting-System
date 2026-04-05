"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookCover } from "@/components/BookCover";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice, getAvailabilityTone } from "@/lib/books";

export function AdminBookDetailPage({ id }) {
  const { token } = useAuth();
  const [book, setBook] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

    async function loadBook() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/admin/books/${id}`, requestOptions);

        if (isActive) {
          setBook(data.book || null);
        }
      } catch (error) {
        if (isActive) {
          setBook(null);
          setErrorMessage(error.message || "Unable to load book detail.");
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
  }, [id, requestOptions, token]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Book Detail
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              {isLoading ? "Loading book..." : book?.title || "Book detail"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Review the listing summary, owner information, pricing, and catalog metadata for one
              book record inside the admin workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/books" className="ui-btn-secondary">
              Back to Books
            </Link>
            {book?.owner?._id ? (
              <Link href={`/admin/users/${book.owner._id}`} className="ui-btn-secondary">
                Open Owner
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <ErrorPanel title="Unable to load book detail" message={errorMessage} />
      ) : isLoading ? (
        <LoadingState />
      ) : !book ? (
        <EmptyPanel
          title="Book not found"
          description="The requested book could not be found or is no longer available."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <BookCover
                src={book.imageUrl}
                title={book.title}
                ratioClassName="aspect-[5/6]"
                containerClassName="rounded-[1.75rem] border-white/70 bg-white"
                imageClassName="object-cover"
              />
            </article>

            <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Owner</p>
              <div className="mt-4 space-y-3">
                <InfoRow label="Name" value={book.owner?.fullName || book.owner?.name || "Unknown owner"} />
                <InfoRow label="Email" value={book.owner?.email || "Not available"} />
                {book.owner?._id ? (
                  <Link href={`/admin/users/${book.owner._id}`} className="ui-btn-secondary inline-flex">
                    Open Owner Detail
                  </Link>
                ) : null}
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                      {toTitleCase(book.listingType)}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getAvailabilityTone(
                        book.availabilityStatus
                      )}`}
                    >
                      {toTitleCase(book.availabilityStatus)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-3xl font-semibold text-slate-900">{book.title}</h3>
                  <p className="mt-2 text-base text-slate-600">by {book.author || "Unknown author"}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <InfoRow label="Category" value={book.category || "Not available"} />
                <InfoRow label="Rental price" value={formatNullablePrice(book.rentalPrice)} />
                <InfoRow label="Sale price" value={formatNullablePrice(book.salePrice)} />
                <InfoRow label="Security deposit" value={formatNullablePrice(book.securityDeposit)} />
                <InfoRow label="Created" value={formatDateTime(book.createdAt)} />
                <InfoRow label="Updated" value={formatDateTime(book.updatedAt)} />
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Description</p>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {book.description || "No description shared for this listing yet."}
              </p>
            </article>

            <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">Quick Links</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/admin/books" className="ui-btn-secondary">
                  Back to Catalog
                </Link>
                {book.owner?._id ? (
                  <Link href={`/admin/users/${book.owner._id}`} className="ui-btn-secondary">
                    Owner Detail
                  </Link>
                ) : null}
                <Link href="/admin/rentals" className="ui-btn-secondary">
                  Open Rentals Section
                </Link>
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-800">{value || "Not available"}</p>
    </div>
  );
}

function ErrorPanel({ title, message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="h-[28rem] animate-pulse rounded-[2rem] border border-white/60 bg-white/70" />
        <div className="h-48 animate-pulse rounded-[2rem] border border-white/60 bg-white/70" />
      </div>
      <div className="space-y-4">
        <div className="h-72 animate-pulse rounded-[2rem] border border-white/60 bg-white/70" />
        <div className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70" />
        <div className="h-32 animate-pulse rounded-[2rem] border border-white/60 bg-white/70" />
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatNullablePrice(value) {
  return typeof value === "number" ? formatPrice(value) : "Not available";
}

function toTitleCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
