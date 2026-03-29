"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { ToastViewport } from "@/components/ToastViewport";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { getPrimaryBookImage } from "@/lib/bookImages";
import { getAvailabilityTone, getListingPriceSummary, toTitleCase } from "@/lib/books";

const PAGE_LIMIT = 50;

export function MyListingsView() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadListings() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/books/mine?page=1&limit=${PAGE_LIMIT}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isActive) {
          setBooks(data.books || []);
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

    loadListings();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleDelete = async (bookId, title) => {
    if (!token) {
      setErrorMessage("Please log in again to delete a listing.");
      return;
    }

    const confirmed = window.confirm(`Delete "${title}"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(bookId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/books/${bookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setBooks((current) => current.filter((book) => book.id !== bookId));
      setSuccessMessage("Listing deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setDeletingId("");
    }
  };

  const listingCounts = books.reduce(
    (summary, book) => {
      const status = book.availabilityStatus || "available";

      summary.total += 1;

      if (status === "available") {
        summary.available += 1;
      } else {
        summary.unavailable += 1;
      }

      return summary;
    },
    {
      total: 0,
      available: 0,
      unavailable: 0
    }
  );

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <ToastViewport
          toasts={[
            successMessage
              ? {
                  id: `listing-success-${successMessage}`,
                  tone: "success",
                  title: "Listing updated",
                  message: successMessage,
                  onDismiss: () => setSuccessMessage("")
                }
              : null
          ]}
        />
        <div className="ui-surface overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                My Listings
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Run your shelf like a seller dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Review every active, reserved, rented, and sold listing in one place with faster
                access to the actions you use most.
              </p>
            </div>

            <Link href="/books/new" className="ui-btn-primary w-full sm:w-auto">
              Add new book
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <SummaryTile
              label="Total listings"
              value={listingCounts.total}
              detail="Everything pulled from your seller inventory."
              tone="slate"
            />
            <SummaryTile
              label="Available now"
              value={listingCounts.available}
              detail="Books ready to receive fresh requests."
              tone="teal"
            />
            <SummaryTile
              label="Unavailable"
              value={listingCounts.unavailable}
              detail="Reserved, rented, sold, or otherwise not currently open."
              tone="amber"
            />
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            Listings on this page come from your protected inventory feed, so reserved, rented,
            and sold books stay visible alongside currently available ones.
          </div>

          {errorMessage ? <p className="request-feedback-error mt-4">{errorMessage}</p> : null}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : books.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {books.map((book) => {
              const priceSummary = getListingPriceSummary(book);
              const availabilityStatus = book.availabilityStatus || "available";
              const availabilityLabel = toTitleCase(availabilityStatus);
              const listingTypeLabel = toTitleCase(book.listingType || "rent");
              const availabilityGuidance = getAvailabilityGuidance(availabilityStatus);

              return (
                <article key={book.id} className="listing-dashboard-card ui-card p-4 sm:p-5 xl:p-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="shrink-0">
                        <BookCover
                          src={getPrimaryBookImage(book)}
                          title={book.title}
                          ratioClassName="aspect-[4/5]"
                          containerClassName="w-24 rounded-[1.4rem] shadow-[0_20px_44px_rgba(15,23,42,0.12)] sm:w-28"
                          labelClassName="tracking-[0.2em]"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {book.category ? (
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
                                {book.category}
                              </p>
                            ) : null}
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                              {listingTypeLabel}
                            </span>
                          </div>
                          <h2 className="mt-2 text-xl font-semibold leading-tight text-slate-900 sm:text-[1.45rem]">
                            {book.title}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600">
                            {book.author ? `by ${book.author}` : "Author unavailable"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${getAvailabilityTone(
                              availabilityStatus
                            )}`}
                          >
                            {availabilityLabel}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                            Owner controls
                          </span>
                        </div>

                        <div className="ui-trust-band">
                          <div className="flex flex-wrap gap-2">
                            <span className="ui-trust-chip">{listingTypeLabel}</span>
                            <span className="ui-trust-chip">{book.condition || "Condition not shared"}</span>
                            <span className="ui-trust-chip">Listed by you</span>
                          </div>
                          <p className="ui-trust-copy">{availabilityGuidance}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      <div className="listing-dashboard-panel">
                        <p className="listing-dashboard-label">Pricing and listing info</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <InfoCard
                            label={priceSummary.primaryLabel}
                            value={priceSummary.primaryValue}
                            meta={priceSummary.approxDailyValue || undefined}
                          />
                          <InfoCard
                            label={priceSummary.secondaryLabel || "Status"}
                            value={priceSummary.secondaryValue || `${availabilityLabel} listing`}
                            meta={priceSummary.secondaryValue ? priceSummary.inlineSummary : undefined}
                          />
                          <InfoCard label="Category" value={book.category || "Uncategorized"} />
                          <InfoCard label="Location" value={book.location || "Location unavailable"} />
                        </div>
                      </div>

                      <div className="listing-dashboard-aside">
                        <div>
                          <p className="listing-dashboard-label">Actions</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Open the public listing, update details, or remove this book from your
                            inventory.
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                          <Link href={`/books/${book.id}`} className="ui-btn-secondary w-full">
                            View details
                          </Link>
                          <Link href={`/books/${book.id}/edit`} className="ui-btn-dark w-full">
                            Edit listing
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(book.id, book.title)}
                            disabled={deletingId === book.id}
                            className="ui-btn-danger w-full"
                          >
                            {deletingId === book.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </ProtectedPage>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="listing-dashboard-card ui-card p-4 sm:p-5 xl:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="ui-skeleton h-28 w-24 rounded-[1.4rem] sm:w-28" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="ui-skeleton-pill w-20" />
                  <div className="ui-skeleton-pill w-24" />
                </div>
                <div className="ui-skeleton-title w-3/4" />
                <div className="ui-skeleton-line w-1/2" />
                <div className="flex gap-2">
                  <div className="ui-skeleton-pill w-24" />
                  <div className="ui-skeleton-pill w-28" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="listing-dashboard-panel space-y-3">
                <div className="ui-skeleton-line w-36" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((__, infoIndex) => (
                    <div key={infoIndex} className="ui-skeleton h-20 rounded-[1.1rem]" />
                  ))}
                </div>
              </div>
              <div className="listing-dashboard-aside space-y-3">
                <div className="ui-skeleton-line w-16" />
                <div className="ui-skeleton-line w-full" />
                <div className="ui-skeleton-button w-full" />
                <div className="ui-skeleton-button w-full" />
                <div className="ui-skeleton-button w-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="request-empty-state">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="request-empty-main">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            My Listings
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Your seller dashboard is ready for its first book
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Add your first listing to start sharing books, receiving reader requests, and building
            a shelf you can manage from one organized workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/books/new" className="ui-btn-primary">
              Add your first book
            </Link>
            <Link href="/books" className="ui-btn-secondary">
              Browse live listings
            </Link>
          </div>
        </div>

        <div className="request-empty-side">
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">What you can do</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Track availability, refine pricing, and keep edit or delete actions close at hand.
            </p>
          </div>
          <div className="request-empty-panel">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Best first step</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Start with one complete listing so your dashboard can begin showing live inventory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, detail, tone = "slate" }) {
  const toneClassName =
    tone === "teal"
      ? "border-teal-200/80 bg-teal-50/80 text-teal-900"
      : tone === "amber"
        ? "border-amber-200/80 bg-amber-50/85 text-amber-900"
        : "border-slate-200/80 bg-white/78 text-slate-900";

  return (
    <div className={`listing-summary-tile ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold sm:text-[2.1rem]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function InfoCard({ label, value, meta }) {
  return (
    <div className="listing-info-card">
      <p className="listing-dashboard-label">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value || "Not available"}</p>
      {meta ? <p className="mt-2 text-xs leading-5 text-slate-500">{meta}</p> : null}
    </div>
  );
}

function getAvailabilityGuidance(status) {
  if (status === "available") {
    return "This listing is open for new reader requests right now.";
  }

  if (status === "reserved") {
    return "A reader has already been approved, so this listing should stay visible but not double-booked.";
  }

  if (status === "rented") {
    return "The handoff is already active. Keep the listing details trustworthy until the return is complete.";
  }

  if (status === "sold") {
    return "This listing is no longer available, but keeping it visible helps preserve a clear owner-side record.";
  }

  return "Review the current status carefully so readers always see accurate availability.";
}
