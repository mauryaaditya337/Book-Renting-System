import Link from "next/link";

import { BookCover } from "@/components/BookCover";
import { SavedBookButton } from "@/components/SavedBookButton";
import { getPrimaryBookImage } from "@/lib/bookImages";
import { getAvailabilityTone, getListingPriceSummary, toTitleCase } from "@/lib/books";

export function BookCard({ book }) {
  const priceSummary = getListingPriceSummary(book);
  const availabilityStatus = book.availabilityStatus || "available";
  const listingTypeLabel = toTitleCase(book.listingType || "rent");
  const conditionLabel = book.condition || "Condition not shared";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2.15rem] border border-white/70 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.1)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(15,23,42,0.16)] sm:p-5">
      <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
        <SavedBookButton book={book} size="compact" />
      </div>

      <Link
        href={`/books/${book.id}`}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
      >
        <div className="relative">
        <BookCover
          src={getPrimaryBookImage(book)}
          title={book.title}
          containerClassName="aspect-[5/6] rounded-[1.85rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(15,23,42,0.08))] shadow-[0_26px_60px_rgba(15,23,42,0.14)]"
          imageClassName="transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-[1.85rem] bg-gradient-to-t from-slate-950/22 via-slate-900/8 to-transparent" />
        <span
          className={`absolute left-3 top-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur ${getAvailabilityTone(
            availabilityStatus
          )}`}
        >
          {toTitleCase(availabilityStatus)}
        </span>
        </div>

        <div className="mt-5 flex flex-1 flex-col">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
              {book.category}
            </p>
            <h2 className="mt-2 line-clamp-2 text-[1.4rem] font-semibold leading-tight text-slate-900 transition group-hover:text-teal-800 sm:text-[1.5rem]">
              {book.title}
            </h2>
            <p className="mt-2 line-clamp-1 text-sm text-slate-600 sm:text-[0.95rem]">
              by {book.author}
            </p>
          </div>

          <div className="mt-5 rounded-[1.55rem] border border-slate-200/80 bg-slate-50/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Weekly rent
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {book.listingType === "sell" ? "Not for rent" : priceSummary.primaryValue}
                </p>
              </div>
              {priceSummary.approxDailyValue ? (
                <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Approx/day
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {priceSummary.approxDailyValue}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailChip label="Location" value={book.location} />
              {priceSummary.secondaryLabel ? (
                <DetailChip label={priceSummary.secondaryLabel} value={priceSummary.secondaryValue} />
              ) : (
                <DetailChip label="Status" value={toTitleCase(availabilityStatus)} />
              )}
            </div>
          </div>

          <div className="ui-trust-band mt-4">
            <div className="flex flex-wrap gap-2">
              <span className="ui-trust-chip">{listingTypeLabel} listing</span>
              <span className="ui-trust-chip">{conditionLabel}</span>
              <span className="ui-trust-chip">{toTitleCase(availabilityStatus)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Review condition, pricing, location, and availability together before you open the
              full listing.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200/80 pt-4 text-sm">
            <span className="font-medium text-slate-500">View details</span>
            <span className="inline-flex items-center gap-2 font-semibold text-teal-700">
              Open
              <ArrowIcon />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function DetailChip({ label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4.5 10h11m0 0-4-4m4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
