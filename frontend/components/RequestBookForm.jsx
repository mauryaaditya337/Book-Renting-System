"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FieldMessage } from "@/components/FieldMessage";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice, getAvailabilityTone, toTitleCase } from "@/lib/books";

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

      setSuccessMessage("Request submitted successfully. Redirecting to your requests...");
      window.setTimeout(() => {
        router.push("/my-requests");
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
      <section className="space-y-6">
        <Link
          href={`/books/${bookId}`}
          className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
        >
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
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                Request Book
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Choose your rental dates
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Submit a rental request for this book. The owner will review it in their incoming
                requests list.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Start date</span>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    min={getToday()}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    required
                  />
                  <FieldMessage message={fieldErrors.startDate} />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">End date</span>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    min={minimumEndDate}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    required
                  />
                  <FieldMessage message={fieldErrors.endDate} />
                </label>

                {formError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}

                {successMessage ? (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSubmitting || book.availabilityStatus !== "available"}
                    className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSubmitting ? "Submitting request..." : "Submit request"}
                  </button>
                  <Link
                    href="/my-requests"
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    View my requests
                  </Link>
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
                <SummaryRow label="Rental price" value={formatPrice(book.rentalPrice)} />
                <SummaryRow label="Security deposit" value={formatPrice(book.securityDeposit)} />
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

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}
