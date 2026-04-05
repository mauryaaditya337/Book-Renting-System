"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice, getAvailabilityTone } from "@/lib/books";

const LISTING_TYPE_OPTIONS = [
  { value: "", label: "All listing types" },
  { value: "rent", label: "Rent" },
  { value: "sell", label: "Sell" },
  { value: "both", label: "Both" }
];

const AVAILABILITY_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "rented", label: "Rented" },
  { value: "sold", label: "Sold" }
];

export function AdminBooksPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("");
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

    async function loadBooks() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const searchParams = new URLSearchParams();

        if (search) {
          searchParams.set("search", search);
        }

        if (listingType) {
          searchParams.set("listingType", listingType);
        }

        if (availabilityStatus) {
          searchParams.set("availabilityStatus", availabilityStatus);
        }

        const path = searchParams.toString()
          ? `/admin/books?${searchParams.toString()}`
          : "/admin/books";
        const data = await apiRequest(path, requestOptions);

        if (isActive) {
          setBooks(data.books || []);
        }
      } catch (error) {
        if (isActive) {
          setBooks([]);
          setErrorMessage(error.message || "Unable to load books.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadBooks();

    return () => {
      isActive = false;
    };
  }, [availabilityStatus, listingType, requestOptions, search, token]);

  const activeFilterCount = [search, listingType, availabilityStatus].filter(Boolean).length;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");
    setListingType("");
    setAvailabilityStatus("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Books</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              Review the full catalog
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Inspect listings, pricing, owner context, and availability from one read-only admin
              view before opening a single book record for more detail.
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Catalog snapshot</p>
            <p className="mt-1">
              {isLoading ? "Loading books..." : `${books.length} listing${books.length === 1 ? "" : "s"} shown`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,0.8fr))_auto_auto]">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by title, author, or category"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          />

          <select
            value={listingType}
            onChange={(event) => setListingType(event.target.value)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          >
            {LISTING_TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={availabilityStatus}
            onChange={(event) => setAvailabilityStatus(event.target.value)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          >
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="submit" className="ui-btn-primary">
            Search
          </button>

          {activeFilterCount ? (
            <button type="button" onClick={handleReset} className="ui-btn-secondary">
              Clear
            </button>
          ) : null}
        </form>
      </div>

      {errorMessage ? (
        <ErrorPanel title="Unable to load books" message={errorMessage} />
      ) : isLoading ? (
        <LoadingState />
      ) : books.length === 0 ? (
        <EmptyState hasFilters={Boolean(activeFilterCount)} />
      ) : (
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.1)] sm:p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Listing</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book._id} className="align-top text-sm text-slate-700">
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p className="font-semibold text-slate-900">{book.title || "Untitled book"}</p>
                      <p className="mt-1 text-slate-600">by {book.author || "Unknown author"}</p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">{book.category || "Not set"}</td>
                    <td className="border-t border-slate-200 px-4 py-4">{toTitleCase(book.listingType)}</td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getAvailabilityTone(
                          book.availabilityStatus
                        )}`}
                      >
                        {toTitleCase(book.availabilityStatus)}
                      </span>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p>{formatBookPricing(book)}</p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {book.owner?.fullName || book.owner?.name || "Unknown owner"}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {book.owner?.email || "No email"}
                      </p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">{formatDateTime(book.createdAt)}</td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <Link href={`/admin/books/${book._id}`} className="ui-btn-secondary whitespace-nowrap">
                        Open Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

function EmptyState({ hasFilters }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">
        {hasFilters ? "No books matched these filters" : "No books found"}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {hasFilters
          ? "Try widening the search, changing the listing type, or clearing the status filter."
          : "Book listings will appear here as the catalog grows."}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
    </div>
  );
}

function formatBookPricing(book) {
  const parts = [];

  if (typeof book.rentalPrice === "number") {
    parts.push(`Rent ${formatPrice(book.rentalPrice)}`);
  }

  if (typeof book.salePrice === "number") {
    parts.push(`Sale ${formatPrice(book.salePrice)}`);
  }

  if (typeof book.securityDeposit === "number") {
    parts.push(`Deposit ${formatPrice(book.securityDeposit)}`);
  }

  return parts.join(" | ") || "Not available";
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

function toTitleCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
