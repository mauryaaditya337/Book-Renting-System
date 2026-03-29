"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FieldMessage } from "@/components/FieldMessage";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { ToastViewport } from "@/components/ToastViewport";
import { apiRequest } from "@/lib/api";
import {
  formatPrice,
  getAvailabilityTone,
  getListingPriceSummary,
  getListingType,
  toTitleCase
} from "@/lib/books";
import { calculateRentalPreview } from "@/lib/rentalRequests";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export function RequestBookForm({ bookId }) {
  const router = useRouter();
  const { token } = useAuth();

  const [book, setBook] = useState(null);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [bookError, setBookError] = useState("");
  const [formData, setFormData] = useState({
    startDate: getToday(),
    endDate: getTomorrow()
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadBook() {
      setIsLoadingBook(true);
      setBookError("");

      try {
        const data = await apiRequest(`/books/${bookId}`, {
          cache: "no-store"
        });

        if (isActive) {
          setBook(data.book);
        }
      } catch (error) {
        if (isActive) {
          setBookError(error.message);
        }
      } finally {
        if (isActive) {
          setIsLoadingBook(false);
        }
      }
    }

    loadBook();

    return () => {
      isActive = false;
    };
  }, [bookId]);

  const minimumEndDate = useMemo(() => {
    if (!formData.startDate) {
      return getTomorrow();
    }

    const nextDay = new Date(formData.startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split("T")[0];
  }, [formData.startDate]);

  const listingType = getListingType(book);
  const isSellListing = listingType === "sell";
  const rentalPreview = useMemo(() => {
    if (!book || isSellListing) {
      return null;
    }

    return calculateRentalPreview(book.rentalPrice, formData.startDate, formData.endDate);
  }, [book, formData.endDate, formData.startDate, isSellListing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFormError("Please log in to request this book.");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    try {
      await apiRequest("/rent-requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          book: bookId,
          startDate: formData.startDate,
          endDate: formData.endDate
        })
      });

      setSuccessMessage("Request submitted successfully. Redirecting to the book details...");
      window.setTimeout(() => {
        router.push(`/books/${bookId}`);
      }, 900);
    } catch (error) {
      if (Array.isArray(error.details) && error.details.length > 0) {
        const nextFieldErrors = {};
        const generalErrors = [];

        error.details.forEach((detail) => {
          if (detail.field) {
            nextFieldErrors[detail.field] = detail.message;
          } else {
            generalErrors.push(detail.message);
          }
        });

        setFieldErrors(nextFieldErrors);
        if (generalErrors.length > 0) {
          setFormError(generalErrors.join(", "));
        }
      } else {
        setFormError(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedPage>
      <section className="space-y-5 sm:space-y-6">
        <ToastViewport
          toasts={[
            successMessage
              ? {
                  id: `request-book-success-${successMessage}`,
                  tone: "success",
                  title: "Request submitted",
                  message: successMessage,
                  onDismiss: () => setSuccessMessage("")
                }
              : null
          ]}
        />
        <Link href={`/books/${bookId}`} className="ui-btn-light w-full rounded-full px-4 py-2 sm:w-auto">
          Back to book details
        </Link>

        {isLoadingBook ? (
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <div className="h-72 animate-pulse rounded-[1.5rem] bg-slate-100" />
          </div>
        ) : bookError ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <h1 className="text-2xl font-semibold">Unable to load this book</h1>
            <p className="mt-2 text-sm leading-6">{bookError}</p>
          </div>
        ) : book ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
            <article className="ui-surface p-6 sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                {isSellListing ? "Buy Request" : "Request Book"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {isSellListing ? "Send a purchase request" : "Choose your rental dates"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                {isSellListing
                  ? "Submit a purchase request for this book. The seller will review it in their incoming requests list."
                  : "Submit a rental request for this book. The owner will review it in their incoming requests list."}
              </p>

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {isSellListing ? (
                  <FormSection
                    title="Request Details"
                    description="This listing still uses a request step before the seller confirms the purchase."
                  >
                    <div className="rounded-[1.35rem] border border-teal-100 bg-teal-50 px-5 py-5 text-sm leading-6 text-slate-700">
                      This sale listing still uses a request step. Send your request here and wait
                      for the seller to approve or reject it.
                    </div>
                  </FormSection>
                ) : (
                  <FormSection
                    title="Rental Period"
                    description="Choose the dates first so the pricing preview reflects the exact rental window."
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <DateField
                        label="Start date"
                        hint="Rental begins"
                        name="startDate"
                        value={formData.startDate}
                        min={getToday()}
                        onChange={handleChange}
                        error={fieldErrors.startDate}
                      />
                      <DateField
                        label="End date"
                        hint="Return by"
                        name="endDate"
                        value={formData.endDate}
                        min={minimumEndDate}
                        onChange={handleChange}
                        error={fieldErrors.endDate}
                      />
                    </div>
                  </FormSection>
                )}

                {!isSellListing && rentalPreview ? (
                  <FormSection
                    title="Pricing Preview"
                    description="This preview uses the same request calculation logic that already exists."
                  >
                    <div className="overflow-hidden rounded-[1.7rem] border border-slate-200/90 bg-white shadow-sm">
                      <div className="bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(15,23,42,0.02))] px-5 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                              Total Rent
                            </p>
                            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                              {formatPrice(rentalPreview.totalRent)}
                            </p>
                          </div>
                          <div className="rounded-[1.25rem] border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Security deposit
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {formatPrice(book.securityDeposit)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 p-4 sm:grid-cols-2">
                        <PricePreviewRow label="Rental days" value={String(rentalPreview.rentalDays)} />
                        <PricePreviewRow label="Rent per week" value={formatPrice(rentalPreview.weeklyRent)} />
                        <PricePreviewRow
                          label="Approx per day"
                          value={`~ ${formatPrice(rentalPreview.perDayRent)}/day`}
                        />
                        <PricePreviewRow label="Total rent" value={formatPrice(rentalPreview.totalRent)} />
                      </div>
                    </div>
                  </FormSection>
                ) : null}

                {formError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}

                <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/85 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isSellListing
                          ? "Ready to send this purchase request?"
                          : "Ready to send this rental request?"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        The owner will review it from their incoming requests view.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || book.availabilityStatus !== "available"}
                        className="ui-btn-primary w-full sm:w-auto"
                      >
                        {isSubmitting
                          ? "Submitting request..."
                          : isSellListing
                            ? "Submit purchase request"
                            : "Submit request"}
                      </button>
                      <Link href="/my-requests" className="ui-btn-secondary w-full sm:w-auto">
                        View my requests
                      </Link>
                    </div>
                  </div>
                </div>
              </form>
            </article>

            <aside className="rounded-[2rem] border border-white/60 bg-slate-900 p-6 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-300">
                Selected Book
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{book.title}</h2>
              <p className="mt-2 text-sm text-slate-300">by {book.author}</p>

              <div className="mt-6 space-y-4 text-sm">
                <SummaryRow label="Owner" value={book.owner?.name || "Unknown"} />
                <SummaryRow label="Location" value={book.location} />
                <SummaryRow label="Listing" value={toTitleCase(listingType)} />
                <SummaryRow label="Pricing" value={getListingPriceSummary(book).inlineSummary} />
                {!isSellListing ? (
                  <SummaryRow label="Security deposit" value={formatPrice(book.securityDeposit)} />
                ) : null}
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Availability</p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getAvailabilityTone(
                      book.availabilityStatus
                    )}`}
                  >
                    {toTitleCase(book.availabilityStatus)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </ProtectedPage>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="ui-subtle-card p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DateField({ error, hint, label, ...props }) {
  return (
    <label className="rounded-[1.35rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {hint}
      </span>
      <span className="mt-2 block text-sm font-medium text-slate-900">{label}</span>
      <input {...props} type="date" className="ui-input mt-3" required />
      <FieldMessage message={error} />
    </label>
  );
}

function PricePreviewRow({ label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
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
