"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import {
  getPrimaryBookImage,
  hydrateRequestBookImages,
  mergeRequestWithBookImage
} from "@/lib/bookImages";
import {
  formatRequestDate,
  getRequestStatusTone,
  toRequestStatusLabel
} from "@/lib/rentalRequests";

const PAGE_LIMIT = 20;

const VIEW_CONFIG = {
  renter: {
    apiPath: "/rent-requests/active/renter",
    eyebrow: "Active Rentals",
    title: "Books you are currently renting",
    description:
      "Track your live rentals and return a book once you have completed the rental.",
    primaryLabel: "Owner",
    emptyTitle: "No active rentals yet",
    emptyDescription: "Once you start an approved rental, it will appear here for tracking.",
    ctaHref: "/books",
    ctaLabel: "Browse books",
    secondaryEmptyHref: "/my-requests",
    secondaryEmptyLabel: "View my requests",
    actionLabel: "Return Book",
    actionVerb: "return-initiate",
    actionMethod: "POST",
    successFallback: "Return initiated successfully.",
    secondaryHref: "/my-requests",
    secondaryLabel: "View my requests"
  },
  owner: {
    apiPath: "/rent-requests/active/owner",
    eyebrow: "Owner Rentals",
    title: "Reserved and active rentals for your books",
    description:
      "Monitor approved reservations and active rentals for your listings in one place.",
    primaryLabel: "Renter",
    emptyTitle: "No owner-side active rentals yet",
    emptyDescription: "Once one of your books is rented out, it will show up here for tracking.",
    ctaHref: "/my-listings",
    ctaLabel: "Go to my listings",
    secondaryEmptyHref: "/incoming-requests",
    secondaryEmptyLabel: "Review incoming requests",
    actionLabel: "Confirm Return",
    actionVerb: "confirm-return",
    actionMethod: "POST",
    successFallback: "Return confirmed successfully.",
    secondaryHref: "/incoming-requests",
    secondaryLabel: "View incoming requests"
  }
};

export function ActiveRentalsView({ mode }) {
  const config = VIEW_CONFIG[mode];
  const { token } = useAuth();

  const [requests, setRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeRequestId, setActiveRequestId] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRequests() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`
        };

        if (isActive) {
          const data = await apiRequest(
            `${config.apiPath}?page=${currentPage}&limit=${PAGE_LIMIT}`,
            {
              cache: "no-store",
              headers
            }
          );

          const requestsWithImages = await hydrateRequestBookImages(data.requests || []);

          setRequests(requestsWithImages);
          setTotalPages(data.totalPages || 1);
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

    loadRequests();

    return () => {
      isActive = false;
    };
  }, [config.apiPath, currentPage, token]);

  const handleAction = async (requestId) => {
    if (!token) {
      return;
    }

    setActiveRequestId(requestId);
    setActionMessage("");
    setActionError("");

    try {
      const data = await apiRequest(`/rent-requests/${requestId}/${config.actionVerb}`, {
        method: config.actionMethod || "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? mergeRequestWithBookImage(request, data.rentalRequest)
            : request
        )
      );
      setActionMessage(data.message || config.successFallback);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActiveRequestId("");
    }
  };

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                {config.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {config.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {config.description}
              </p>
            </div>

            <Link
              href={config.secondaryHref}
              className="rounded-2xl bg-teal-700 px-5 py-3 text-center font-medium text-white transition hover:bg-teal-800"
            >
              {config.secondaryLabel}
            </Link>
          </div>
        </div>

        {actionMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </p>
        ) : null}

        {actionError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} title={config.eyebrow} />
        ) : requests.length === 0 ? (
          <EmptyState config={config} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {requests.map((request) => {
                const isSubmitting = activeRequestId === request.id;
                const canAct =
                  mode === "renter"
                    ? request.status === "active"
                    : request.status === "return_pending";

                return (
                  <article
                    key={request.id}
                    className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <BookCover
                          src={getPrimaryBookImage(request.book)}
                          title={request.book?.title}
                          ratioClassName="aspect-[4/5]"
                          containerClassName="w-24 shrink-0 rounded-[1.25rem]"
                          labelClassName="tracking-[0.2em]"
                        />
                        <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                            {request.book?.category}
                          </p>
                          <h2 className="mt-2 text-xl font-semibold text-slate-900">
                            {request.book?.title}
                          </h2>
                          <p className="mt-1 text-sm text-slate-600">
                            {config.primaryLabel}: {getCounterpartyName(mode, request)}
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                          <InfoRow
                            label={config.primaryLabel}
                            value={getCounterpartyName(mode, request)}
                          />
                          <InfoRow label="Start date" value={formatRequestDate(request.startDate)} />
                          <InfoRow label="End date" value={formatRequestDate(request.endDate)} />
                          <InfoRow label="Status" value={toRequestStatusLabel(request.status)} />
                        </div>
                      </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:min-w-56 lg:items-end">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRequestStatusTone(
                            request.status
                          )}`}
                        >
                          {toRequestStatusLabel(request.status)}
                        </span>

                        <div className="flex flex-col gap-3 sm:flex-row lg:w-full lg:flex-col">
                          <Link
                            href={`/books/${request.book?.id}`}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                          >
                            View book
                          </Link>

                          {canAct && config.actionVerb ? (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleAction(request.id)}
                              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                              {isSubmitting ? "Updating..." : config.actionLabel}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </ProtectedPage>
  );
}

function getCounterpartyName(mode, request) {
  return mode === "renter" ? request.owner?.name || "Unknown owner" : request.renter?.name || "Unknown renter";
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
    </div>
  );
}

function ErrorState({ message, title }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">Unable to load {title.toLowerCase()}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyState({ config }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">{config.emptyTitle}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{config.emptyDescription}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href={config.ctaHref}
          className="inline-flex rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
        >
          {config.ctaLabel}
        </Link>
        {config.secondaryEmptyHref ? (
          <Link
            href={config.secondaryEmptyHref}
            className="inline-flex rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
          >
            {config.secondaryEmptyLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
