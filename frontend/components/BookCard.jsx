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
  const ownerName = book.owner?.fullName || book.owner?.name || "";
  const metadata = [
    `${listingTypeLabel} listing`,
    conditionLabel,
    book.category,
    book.location,
    book.distance || book.distanceText || ""
  ].filter(Boolean);

  return (
    <article className="book-catalog-card group relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/94 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition duration-300 hover:border-slate-200 hover:shadow-[0_18px_48px_rgba(15,23,42,0.1)] md:p-3.5 lg:p-4">
      <div className="absolute right-3 top-3 z-10 md:right-4 md:top-4">
        <SavedBookButton book={book} size="compact" />
      </div>

      <Link
        href={`/books/${book.id}`}
        className="book-catalog-link flex h-full flex-col gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 max-[560px]:flex-row max-[560px]:items-start max-[560px]:gap-3 md:flex-row md:items-start md:gap-3.5 lg:gap-4"
      >
        <div className="relative mx-auto w-full max-w-[7.5rem] shrink-0 max-[560px]:mx-0 max-[560px]:w-[5.35rem] max-[560px]:max-w-[5.35rem] md:mx-0 md:w-[6rem] md:max-w-[6rem] lg:w-[7rem] lg:max-w-[7rem]">
          <BookCover
            src={getPrimaryBookImage(book)}
            title={book.title}
            ratioClassName="aspect-[4/5]"
            containerClassName="book-catalog-cover rounded-[1.2rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(15,23,42,0.06))] shadow-[0_16px_34px_rgba(15,23,42,0.12)]"
            imageClassName="transition duration-500 group-hover:scale-[1.02]"
            labelClassName="tracking-[0.2em]"
          />
        </div>

        <div className="min-w-0 flex flex-1 flex-col">
          <div className="flex flex-col gap-2.5 pr-10 max-[560px]:pr-0 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-3 md:gap-y-2 md:pr-11 lg:flex lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-3 lg:pr-12">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getAvailabilityTone(
                  availabilityStatus
                )}`}
              >
                {toTitleCase(availabilityStatus)}
              </span>
              <h2 className="mt-1.5 line-clamp-2 text-[1.02rem] font-semibold leading-tight text-slate-900 transition group-hover:text-teal-800 md:mt-2 md:text-[1.08rem] lg:text-[1.16rem]">
                {book.title}
              </h2>
              <p className="mt-1 line-clamp-1 text-sm text-slate-600">by {book.author}</p>
              {ownerName ? (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 md:text-[11px] md:tracking-[0.14em]">
                  Owner: {ownerName}
                </p>
              ) : null}
            </div>

            <div className="book-catalog-price shrink-0 rounded-[1.1rem] border border-slate-200/80 bg-slate-50/92 px-3 py-2.5 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] max-[560px]:min-w-[6.6rem] max-[560px]:px-2.5 max-[560px]:py-2 md:min-w-[7.15rem] md:self-start lg:min-w-[8rem] lg:self-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {priceSummary.approxDailyValue ? "Per day" : priceSummary.primaryLabel}
              </p>
              <p className="mt-1 text-[1.05rem] font-semibold text-slate-900">
                {priceSummary.approxDailyValue || priceSummary.primaryValue}
              </p>
              {priceSummary.approxDailyValue && book.listingType !== "sell" ? (
                <p className="mt-1 text-xs text-slate-500">{priceSummary.primaryValue}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {metadata.map((item) => (
              <span key={item} className="book-catalog-chip">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-3 grid gap-2.5 max-[560px]:gap-2 md:grid-cols-[minmax(0,1fr)_minmax(9.5rem,10.5rem)] md:items-center md:gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(10.25rem,auto)]">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Price details
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>{priceSummary.primaryLabel}: {priceSummary.primaryValue}</span>
                {priceSummary.secondaryLabel ? (
                  <span>{priceSummary.secondaryLabel}: {priceSummary.secondaryValue}</span>
                ) : null}
              </div>
            </div>

            <div className="book-catalog-cta flex items-center justify-between gap-2.5 rounded-[1.15rem] border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm max-[560px]:px-3 max-[560px]:py-2.5 md:px-3 md:py-2 lg:px-3.5 lg:py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Primary action
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">Request Book</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:text-xs md:tracking-[0.14em]">
                Open
                <ArrowIcon />
              </span>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-200/80 pt-2.5">
            <p className="line-clamp-2 text-sm leading-[1.35rem] text-slate-600">
              Review condition, pricing, location, and availability together before opening the full listing.
            </p>
          </div>
        </div>
      </Link>
    </article>
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
