import Link from "next/link";

import { BookCover } from "@/components/BookCover";
import { getPrimaryBookImage } from "@/lib/bookImages";
import { formatPrice, getAvailabilityTone, toTitleCase } from "@/lib/books";

export function BookCard({ book }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="group flex h-full flex-col rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)] transition hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.14)]"
    >
      <BookCover
        src={getPrimaryBookImage(book)}
        title={book.title}
        containerClassName="mb-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
            {book.category}
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-900 transition group-hover:text-teal-800">
            {book.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">by {book.author}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${getAvailabilityTone(
            book.availabilityStatus
          )}`}
        >
          {toTitleCase(book.availabilityStatus)}
        </span>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <DetailChip label="Rental price" value={formatPrice(book.rentalPrice)} />
        <DetailChip label="Location" value={book.location} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-slate-500">View details</span>
        <span className="font-medium text-teal-700">Open</span>
      </div>
    </Link>
  );
}

function DetailChip({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}
