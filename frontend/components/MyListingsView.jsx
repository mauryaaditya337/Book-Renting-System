"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { apiRequest } from "@/lib/api";
import { getPrimaryBookImage } from "@/lib/bookImages";
import { formatPrice, getAvailabilityTone, toTitleCase } from "@/lib/books";

const PAGE_LIMIT = 50;

export function MyListingsView() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadListings() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/books/mine?page=1&limit=${PAGE_LIMIT}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isActive) {
          setBooks(data.books || []);
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

    loadListings();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleDelete = async (bookId, title) => {
    if (!token) {
      setErrorMessage("Please log in again to delete a listing.");
      return;
    }

    const confirmed = window.confirm(`Delete "${title}"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingId(bookId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/books/${bookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setBooks((current) => current.filter((book) => book.id !== bookId));
      setSuccessMessage("Listing deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                My Listings
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Manage your book listings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Review your current listings, delete a book, or jump into the add-book flow.
              </p>
            </div>

            <Link
              href="/books/new"
              className="rounded-2xl bg-teal-700 px-5 py-3 text-center font-medium text-white transition hover:bg-teal-800"
            >
              Add new book
            </Link>
          </div>

          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Listings now load from the protected `GET /api/books/mine` route, so this page shows
            all of your books, including unavailable or rented ones.
          </p>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : books.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {books.map((book) => (
              <article
                key={book.id}
                className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex gap-4">
                    <BookCover
                      src={getPrimaryBookImage(book)}
                      title={book.title}
                      ratioClassName="aspect-[4/5]"
                      containerClassName="w-24 shrink-0 rounded-[1.25rem]"
                      labelClassName="tracking-[0.2em]"
                    />
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                        {book.category}
                      </p>
                      <h2 className="text-xl font-semibold text-slate-900">{book.title}</h2>
                      <p className="text-sm text-slate-600">by {book.author}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span>{formatPrice(book.rentalPrice)}</span>
                        <span className="text-slate-300">/</span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getAvailabilityTone(
                            book.availabilityStatus
                          )}`}
                        >
                          {toTitleCase(book.availabilityStatus)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/books/${book.id}`}
                      className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                    >
                      View details
                    </Link>
                    <button
                      type="button"
                      disabled
                      className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
                    >
                      Edit later
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(book.id, book.title)}
                      disabled={deletingId === book.id}
                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                    >
                      {deletingId === book.id ? "Deleting..." : "Delete"}
                    </button>
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

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Your shelf is still empty</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Add your first listing to start sharing books with readers and receiving requests.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/books/new"
          className="inline-flex rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
        >
          Add your first book
        </Link>
        <Link
          href="/books"
          className="inline-flex rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Browse live listings
        </Link>
      </div>
    </div>
  );
}
