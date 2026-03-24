"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookCard } from "@/components/BookCard";
import { apiRequest } from "@/lib/api";

const PAGE_LIMIT = 6;

const initialFilters = {
  search: "",
  category: "",
  location: ""
};

export function BooksBrowse() {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBooks: 0
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (appliedFilters.search.trim()) {
      params.set("search", appliedFilters.search.trim());
    }

    if (appliedFilters.category.trim()) {
      params.set("category", appliedFilters.category.trim());
    }

    if (appliedFilters.location.trim()) {
      params.set("location", appliedFilters.location.trim());
    }

    params.set("page", String(pagination.currentPage));
    params.set("limit", String(PAGE_LIMIT));

    return params.toString();
  }, [appliedFilters, pagination.currentPage]);

  useEffect(() => {
    let isActive = true;

    async function loadBooks() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/books?${queryString}`, {
          cache: "no-store"
        });

        if (!isActive) {
          return;
        }

        setBooks(data.books || []);
        setPagination((current) => ({
          ...current,
          currentPage: Number(data.currentPage) || 1,
          totalPages: Number(data.totalPages) || 1,
          totalBooks: Number(data.totalBooks) || 0
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setBooks([]);
        setErrorMessage(error.message);
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
  }, [queryString]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setDraftFilters((current) => ({ ...current, [name]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(draftFilters);
    setPagination((current) => ({ ...current, currentPage: 1 }));
  };

  const handleResetFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPagination((current) => ({ ...current, currentPage: 1 }));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Browse Books</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Find books from the community
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Search by title or author, narrow by category or location, and browse all
              listings with available books shown first.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
              {pagination.totalBooks} book{pagination.totalBooks === 1 ? "" : "s"} found
            </div>
            <Link
              href="/request-book"
              className="rounded-2xl bg-teal-700 px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-teal-800"
            >
              Can&apos;t find your book? Request it
            </Link>
          </div>
        </div>

        <form className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]" onSubmit={handleApplyFilters}>
          <FilterInput
            label="Search"
            name="search"
            value={draftFilters.search}
            onChange={handleFilterChange}
            placeholder="Search title or author"
          />
          <FilterInput
            label="Category"
            name="category"
            value={draftFilters.category}
            onChange={handleFilterChange}
            placeholder="Programming"
          />
          <FilterInput
            label="Location"
            name="location"
            value={draftFilters.location}
            onChange={handleFilterChange}
            placeholder="Pune"
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <button
              type="submit"
              className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : books.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(nextPage) =>
              setPagination((current) => ({ ...current, currentPage: nextPage }))
            }
          />
        </>
      )}
    </section>
  );
}

function FilterInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-[2rem] border border-white/60 bg-white/70 p-5"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">Unable to load books</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">No books match these filters</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Try a broader search, remove a filter, or check back after more listings are added.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/request-book"
          className="inline-flex rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
        >
          Can&apos;t find your book? Request it
        </Link>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-sm">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`h-10 w-10 rounded-full text-sm font-medium transition ${
            currentPage === page
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
