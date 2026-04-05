"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "return_pending", label: "Return Pending" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" }
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All payment states" },
  { value: "unpaid", label: "Unpaid" },
  { value: "locked", label: "Locked" },
  { value: "settled", label: "Settled" },
  { value: "refunded", label: "Refunded" }
];

const SETTLEMENT_OPTIONS = [
  { value: "", label: "All settlement states" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" }
];

export function AdminRentalsPage() {
  const { token } = useAuth();
  const [rentalRequests, setRentalRequests] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [settlementStatus, setSettlementStatus] = useState("");
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

    async function loadRentals() {
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

        if (status) {
          searchParams.set("status", status);
        }

        if (paymentStatus) {
          searchParams.set("paymentStatus", paymentStatus);
        }

        if (settlementStatus) {
          searchParams.set("settlementStatus", settlementStatus);
        }

        const path = searchParams.toString()
          ? `/admin/rentals?${searchParams.toString()}`
          : "/admin/rentals";
        const data = await apiRequest(path, requestOptions);

        if (isActive) {
          setRentalRequests(data.rentalRequests || []);
        }
      } catch (error) {
        if (isActive) {
          setRentalRequests([]);
          setErrorMessage(error.message || "Unable to load rentals.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadRentals();

    return () => {
      isActive = false;
    };
  }, [paymentStatus, requestOptions, search, settlementStatus, status, token]);

  const activeFilterCount = [search, status, paymentStatus, settlementStatus].filter(Boolean).length;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setSettlementStatus("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Rentals</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              Monitor rental request activity
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Review request lifecycle state, linked users, book context, and locked amounts from
              one read-only admin page before opening a full rental detail.
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Rental snapshot</p>
            <p className="mt-1">
              {isLoading
                ? "Loading rentals..."
                : `${rentalRequests.length} request${rentalRequests.length === 1 ? "" : "s"} shown`}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 grid gap-3 2xl:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,0.7fr))_auto_auto]"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by book, renter, or owner"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          />

          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <FilterSelect value={paymentStatus} onChange={setPaymentStatus} options={PAYMENT_OPTIONS} />
          <FilterSelect value={settlementStatus} onChange={setSettlementStatus} options={SETTLEMENT_OPTIONS} />

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
        <ErrorPanel title="Unable to load rentals" message={errorMessage} />
      ) : isLoading ? (
        <LoadingState />
      ) : rentalRequests.length === 0 ? (
        <EmptyState hasFilters={Boolean(activeFilterCount)} />
      ) : (
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.1)] sm:p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Renter</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Settlement</th>
                  <th className="px-4 py-3 font-medium">Locked amount</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rentalRequests.map((request) => (
                  <tr key={request._id} className="align-top text-sm text-slate-700">
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p className="font-semibold text-slate-900 break-all">{request._id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Updated {formatDateTime(request.updatedAt)}
                      </p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p className="font-medium text-slate-900">{request.book?.title || "Book unavailable"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {toLabel(request.book?.listingType) || "Listing unavailable"}
                      </p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {request.renter?.fullName || request.renter?.name || "Unknown renter"}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {request.renter?.email || "No email"}
                      </p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {request.owner?.fullName || request.owner?.name || "Unknown owner"}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {request.owner?.email || "No email"}
                      </p>
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <StatusPill value={request.status} tone={getLifecycleTone(request.status)} />
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <StatusPill value={request.paymentStatus} tone={getPaymentTone(request.paymentStatus)} />
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <StatusPill
                        value={request.settlementStatus}
                        tone={getSettlementTone(request.settlementStatus)}
                      />
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      {formatPrice(request.totalLockedAmount)}
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      {formatDateTime(request.createdAt)}
                    </td>
                    <td className="border-t border-slate-200 px-4 py-4">
                      <Link href={`/admin/rentals/${request._id}`} className="ui-btn-secondary whitespace-nowrap">
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

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
    >
      {options.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ value, tone }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>
      {toLabel(value)}
    </span>
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
        {hasFilters ? "No rentals matched these filters" : "No rentals found"}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {hasFilters
          ? "Try a different search term or clear one of the status filters."
          : "Rental requests will appear here once the platform has request activity."}
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

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLifecycleTone(status) {
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "return_pending") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (status === "active" || status === "approved") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getPaymentTone(status) {
  if (status === "locked") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "settled") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "refunded") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getSettlementTone(status) {
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "refunded") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}
