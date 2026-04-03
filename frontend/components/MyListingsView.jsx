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
      <section className="my-listings-page space-y-5 md:space-y-6">
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
        <div className="ui-surface my-listings-hero overflow-hidden p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                My Listings
              </p>
              <h1 className="mt-2.5 text-3xl font-semibold text-slate-900 md:mt-3 md:text-[2.55rem]">
                Run your shelf like a seller dashboard
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 md:mt-2">
                Review every active, reserved, rented, and sold listing in one place with quick
                access to the owner actions you use most.
              </p>
            </div>

            <Link href="/books/new" className="ui-btn-primary w-full md:w-auto">
              Add new book
            </Link>
          </div>

          <div className="my-listings-summary mt-4 grid gap-2.5 lg:grid-cols-3">
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

          <div className="my-listings-note mt-4 rounded-[1.5rem] border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] md:px-5">
            Reserved, rented, and sold books stay visible here too, so your inventory history
            remains easy to manage alongside currently available listings.
          </div>

          {errorMessage ? <p className="request-feedback-error mt-4">{errorMessage}</p> : null}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : books.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="my-listings-grid grid gap-4 2xl:grid-cols-2">
            {books.map((book) => {
              const priceSummary = getListingPriceSummary(book);
              const availabilityStatus = book.availabilityStatus || "available";
              const availabilityLabel = toTitleCase(availabilityStatus);
              const listingTypeLabel = toTitleCase(book.listingType || "rent");
              const availabilityGuidance = getAvailabilityGuidance(availabilityStatus);

              return (
                <article
                  key={book.id}
                  className="listing-dashboard-card my-listing-card ui-card p-4 md:p-5 xl:p-5"
                >
                  <div className="flex flex-col gap-4.5 md:gap-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <div className="shrink-0">
                        <BookCover
                          src={getPrimaryBookImage(book)}
                          title={book.title}
                          ratioClassName="aspect-[4/5]"
                          containerClassName="w-24 rounded-[1.4rem] shadow-[0_20px_44px_rgba(15,23,42,0.12)] md:w-28"
                          labelClassName="tracking-[0.2em]"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-3.5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {book.category ? (
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
                                {book.category}
                              </p>
                            ) : null}
                            <span className="rounded-full border border-slate-200/80 bg-slate-100/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                              {listingTypeLabel}
                            </span>
                          </div>
                          <h2 className="mt-2 text-xl font-semibold leading-tight text-slate-900 md:text-[1.4rem]">
                            {book.title}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600">
                            {book.author ? `by ${book.author}` : "Author unavailable"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${getAvailabilityTone(
                              availabilityStatus
                            )}`}
                          >
                            {availabilityLabel}
                          </span>
                          <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            Owner view
                          </span>
                        </div>

                        <div className="ui-trust-band my-listing-guidance">
                          <div className="flex flex-wrap gap-2">
                            <span className="ui-trust-chip">{listingTypeLabel}</span>
                            <span className="ui-trust-chip">{book.condition || "Condition not shared"}</span>
                            <span className="ui-trust-chip">Listed by you</span>
                          </div>
                          <p className="ui-trust-copy">{availabilityGuidance}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                      <div className="listing-dashboard-panel">
                        <p className="listing-dashboard-label">Pricing and listing info</p>
                        <div className="mt-3.5 grid gap-3 lg:grid-cols-2">
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
                          <p className="mt-1.5 text-sm leading-6 text-slate-600">
                            Open the public page, update the listing, or remove it from your
                            inventory.
                          </p>
                        </div>

                        <div className="mt-4 grid gap-2.5">
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
                            className="ui-btn-danger-soft w-full"
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
    <div className="my-listings-grid grid gap-4 2xl:grid-cols-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="listing-dashboard-card ui-card p-4 md:p-5 xl:p-5">
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="ui-skeleton h-28 w-24 rounded-[1.4rem] md:w-28" />
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

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="listing-dashboard-panel space-y-3">
                <div className="ui-skeleton-line w-36" />
                <div className="grid gap-3 lg:grid-cols-2">
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
    <div className="request-empty-state my-listings-empty-state">
      <div className="grid gap-0 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="request-empty-main my-listings-empty-main">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            My Listings
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">
            Your seller dashboard is ready for its first book
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
            Add your first listing to start sharing books, receiving reader requests, and building
            a shelf you can manage from one organized workspace.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/books/new" className="ui-btn-primary">
              Add your first book
            </Link>
            <Link href="/books" className="ui-btn-secondary">
              Browse live listings
            </Link>
          </div>
        </div>

        <div className="request-empty-side my-listings-empty-side">
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
    <div className={`listing-summary-tile my-listings-summary-tile ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-[1.9rem] font-semibold md:text-[2rem]">{value}</p>
      <p className="mt-1 text-sm leading-5.5 text-slate-600">{detail}</p>
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
