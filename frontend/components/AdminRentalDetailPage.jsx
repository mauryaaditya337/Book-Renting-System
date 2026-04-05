"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

export function AdminRentalDetailPage({ id }) {
  const { token } = useAuth();
  const [rentalRequest, setRentalRequest] = useState(null);
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

    async function loadRentalRequest() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/admin/rentals/${id}`, requestOptions);

        if (isActive) {
          setRentalRequest(data.rentalRequest || null);
        }
      } catch (error) {
        if (isActive) {
          setRentalRequest(null);
          setErrorMessage(error.message || "Unable to load rental detail.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadRentalRequest();

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
              Rental Detail
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              {isLoading
                ? "Loading rental..."
                : rentalRequest?.book?.title || "Rental request detail"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Inspect the full request lifecycle, linked book and users, financial state, and
              admin-reference timestamps from one read-only screen.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/rentals" className="ui-btn-secondary">
              Back to Rentals
            </Link>
            <Link href="/admin/financial" className="ui-btn-secondary">
              Open Financial
            </Link>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <ErrorPanel title="Unable to load rental detail" message={errorMessage} />
      ) : isLoading ? (
        <LoadingState />
      ) : !rentalRequest ? (
        <EmptyPanel
          title="Rental request not found"
          description="The requested rental request could not be found or is no longer available."
        />
      ) : (
        <div className="space-y-6">
          <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                  Request ID
                </p>
                <h3 className="mt-2 break-all text-xl font-semibold text-slate-900">
                  {rentalRequest._id}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Book: {rentalRequest.book?.title || "Book unavailable"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusPill value={rentalRequest.status} tone={getLifecycleTone(rentalRequest.status)} />
                <StatusPill
                  value={rentalRequest.paymentStatus}
                  tone={getPaymentTone(rentalRequest.paymentStatus)}
                />
                <StatusPill
                  value={rentalRequest.settlementStatus}
                  tone={getSettlementTone(rentalRequest.settlementStatus)}
                />
              </div>
            </div>
          </article>

          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Lifecycle Summary">
              <InfoRow label="Status" value={toLabel(rentalRequest.status)} />
              <InfoRow label="Requested start" value={formatDateTime(rentalRequest.startDate)} />
              <InfoRow label="Requested return" value={formatDateTime(rentalRequest.endDate)} />
              <InfoRow label="Actual start" value={formatDateTime(rentalRequest.actualStartDate)} />
              <InfoRow label="Actual return" value={formatDateTime(rentalRequest.actualReturnDate)} />
              <InfoRow label="Created" value={formatDateTime(rentalRequest.createdAt)} />
              <InfoRow label="Updated" value={formatDateTime(rentalRequest.updatedAt)} />
              {rentalRequest.rejectionReason ? (
                <InfoRow label="Rejection reason" value={rentalRequest.rejectionReason} />
              ) : null}
            </SectionCard>

            <SectionCard title="Book Info">
              <InfoRow label="Title" value={rentalRequest.book?.title || "Book unavailable"} />
              <InfoRow label="Author" value={rentalRequest.book?.author || "Not available"} />
              <InfoRow label="Category" value={rentalRequest.book?.category || "Not available"} />
              <InfoRow label="Listing type" value={toLabel(rentalRequest.book?.listingType)} />
              <InfoRow label="Rental price" value={formatNullablePrice(rentalRequest.book?.rentalPrice)} />
              <InfoRow label="Sale price" value={formatNullablePrice(rentalRequest.book?.salePrice)} />
              <InfoRow
                label="Security deposit"
                value={formatNullablePrice(rentalRequest.book?.securityDeposit)}
              />
              {rentalRequest.book?._id ? (
                <Link href={`/admin/books/${rentalRequest.book._id}`} className="ui-btn-secondary inline-flex">
                  Open Book Detail
                </Link>
              ) : null}
            </SectionCard>

            <SectionCard title="Quick Links">
              <div className="flex flex-wrap gap-3">
                {rentalRequest.renter?._id ? (
                  <Link href={`/admin/users/${rentalRequest.renter._id}`} className="ui-btn-secondary">
                    Renter Detail
                  </Link>
                ) : null}
                {rentalRequest.owner?._id ? (
                  <Link href={`/admin/users/${rentalRequest.owner._id}`} className="ui-btn-secondary">
                    Owner Detail
                  </Link>
                ) : null}
                {rentalRequest.book?._id ? (
                  <Link href={`/admin/books/${rentalRequest.book._id}`} className="ui-btn-secondary">
                    Book Detail
                  </Link>
                ) : null}
                <Link href="/admin/financial" className="ui-btn-secondary">
                  Financial Section
                </Link>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Renter Info">
              <InfoRow
                label="Name"
                value={rentalRequest.renter?.fullName || rentalRequest.renter?.name || "Unknown renter"}
              />
              <InfoRow label="Email" value={rentalRequest.renter?.email || "Not available"} />
              {rentalRequest.renter?._id ? (
                <Link href={`/admin/users/${rentalRequest.renter._id}`} className="ui-btn-secondary inline-flex">
                  Open Renter
                </Link>
              ) : null}
            </SectionCard>

            <SectionCard title="Owner Info">
              <InfoRow
                label="Name"
                value={rentalRequest.owner?.fullName || rentalRequest.owner?.name || "Unknown owner"}
              />
              <InfoRow label="Email" value={rentalRequest.owner?.email || "Not available"} />
              {rentalRequest.owner?._id ? (
                <Link href={`/admin/users/${rentalRequest.owner._id}`} className="ui-btn-secondary inline-flex">
                  Open Owner
                </Link>
              ) : null}
            </SectionCard>

            <SectionCard title="Financial Info">
              <InfoRow label="Payment status" value={toLabel(rentalRequest.paymentStatus)} />
              <InfoRow label="Settlement status" value={toLabel(rentalRequest.settlementStatus)} />
              <InfoRow label="Weekly rent snapshot" value={formatNullablePrice(rentalRequest.weeklyRentSnapshot)} />
              <InfoRow label="Per-day rent snapshot" value={formatNullablePrice(rentalRequest.perDayRentSnapshot)} />
              <InfoRow label="Rental days" value={formatCount(rentalRequest.rentalDays)} />
              <InfoRow label="Total rent" value={formatNullablePrice(rentalRequest.totalRent)} />
              <InfoRow label="Locked rent" value={formatNullablePrice(rentalRequest.lockedRent)} />
              <InfoRow label="Locked deposit" value={formatNullablePrice(rentalRequest.lockedDeposit)} />
              <InfoRow label="Total locked amount" value={formatNullablePrice(rentalRequest.totalLockedAmount)} />
              <InfoRow
                label="Financial action version"
                value={formatCount(rentalRequest.financialActionVersion)}
              />
              <InfoRow label="Payment reference" value={rentalRequest.paymentReference || "Not captured"} />
            </SectionCard>
          </div>

          <SectionCard title="Timestamps">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <InfoRow label="Payment confirmed" value={formatDateTime(rentalRequest.paymentConfirmedAt)} />
              <InfoRow label="Funds locked" value={formatDateTime(rentalRequest.fundsLockedAt)} />
              <InfoRow label="Settled" value={formatDateTime(rentalRequest.settledAt)} />
              <InfoRow label="Deposit refunded" value={formatDateTime(rentalRequest.depositRefundedAt)} />
              <InfoRow label="Rent released" value={formatDateTime(rentalRequest.rentReleasedAt)} />
              <InfoRow label="Actual start" value={formatDateTime(rentalRequest.actualStartDate)} />
              <InfoRow label="Actual return" value={formatDateTime(rentalRequest.actualReturnDate)} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">{title}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </article>
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
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
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

function formatNullablePrice(value) {
  return typeof value === "number" ? formatPrice(value) : "Not available";
}

function formatCount(value) {
  return typeof value === "number" ? String(value) : "Not available";
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
