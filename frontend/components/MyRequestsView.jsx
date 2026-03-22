"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { getPrimaryBookImage, hydrateRequestBookImages } from "@/lib/bookImages";
import {
  formatRequestDate,
  formatRequestDateTime,
  getRequestStatusTone,
  toRequestStatusLabel
} from "@/lib/rentalRequests";

const PAGE_LIMIT = 20;

export function MyRequestsView() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRequests() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/rent-requests/outgoing?page=1&limit=${PAGE_LIMIT}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const requestsWithImages = await hydrateRequestBookImages(data.requests || []);

        if (isActive) {
          setRequests(requestsWithImages);
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
  }, [token]);

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                My Requests
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Track your outgoing book requests
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Review the books you have requested, who owns them, and the current request
                status.
              </p>
            </div>

            <Link
              href="/books"
              className="rounded-2xl bg-teal-700 px-5 py-3 text-center font-medium text-white transition hover:bg-teal-800"
            >
              Browse books
            </Link>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
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
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                          {request.book?.category}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-slate-900">
                          {request.book?.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">by {request.book?.author}</p>
                      </div>
                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <InfoRow label="Owner" value={request.owner?.name || "Unknown"} />
                        <InfoRow label="Start date" value={formatRequestDate(request.startDate)} />
                        <InfoRow label="End date" value={formatRequestDate(request.endDate)} />
                        <InfoRow label="Requested on" value={formatRequestDateTime(request.createdAt)} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRequestStatusTone(
                        request.status
                      )}`}
                    >
                      {toRequestStatusLabel(request.status)}
                    </span>
                    <Link
                      href={`/books/${request.book?.id}`}
                      className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                    >
                      View book
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </ProtectedPage>
  );
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
          className="h-36 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">Unable to load requests</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">No outgoing requests yet</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Browse available books and send your first request to start tracking approvals here.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/books"
          className="inline-flex rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
        >
          Browse books
        </Link>
        <Link
          href="/active-rentals"
          className="inline-flex rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
        >
          View active rentals
        </Link>
      </div>
    </div>
  );
}
