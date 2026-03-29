"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BookCard } from "@/components/BookCard";
import { apiRequest } from "@/lib/api";
import { useSavedBooks } from "@/lib/savedBooks";

const PAGE_LIMIT = 6;

const initialFilters = {
  search: "",
  category: "",
  location: ""
};

export function BooksBrowse({ initialView = "all" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { savedBooks, savedCount, hasHydrated } = useSavedBooks();
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBooks: 0
  });
  const isSavedView = initialView === "saved";

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
    setIsFiltersOpen(false);
  };

  const activeFilterCount = [
    appliedFilters.search.trim(),
    appliedFilters.category.trim(),
    appliedFilters.location.trim()
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;
  const hasPendingChanges =
    draftFilters.search !== appliedFilters.search ||
    draftFilters.category !== appliedFilters.category ||
    draftFilters.location !== appliedFilters.location;

  const activeFilters = [
    appliedFilters.search.trim()
      ? { key: "search", label: `Search: ${appliedFilters.search.trim()}` }
      : null,
    appliedFilters.category.trim()
      ? { key: "category", label: `Category: ${appliedFilters.category.trim()}` }
      : null,
    appliedFilters.location.trim()
      ? { key: "location", label: `Location: ${appliedFilters.location.trim()}` }
      : null
  ].filter(Boolean);

  const filteredSavedBooks = useMemo(
    () => filterSavedBooks(savedBooks, appliedFilters),
    [savedBooks, appliedFilters]
  );

  const displayedBooks = isSavedView ? filteredSavedBooks : books;
  const totalResults = isSavedView ? filteredSavedBooks.length : pagination.totalBooks;

  const quickCategories = useMemo(() => {
    const counts = new Map();

    displayedBooks.forEach((book) => {
      const value = book.category?.trim();
      if (!value) {
        return;
      }

      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([value]) => value);
  }, [displayedBooks]);

  const quickLocations = useMemo(() => {
    const counts = new Map();

    displayedBooks.forEach((book) => {
      const value = book.location?.trim();
      if (!value) {
        return;
      }

      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([value]) => value);
  }, [displayedBooks]);

  const resultLabel = isSavedView
    ? `${totalResults} saved book${totalResults === 1 ? "" : "s"}`
    : getResultLabel(totalResults);
  const visibleCount = displayedBooks.length;
  const shouldShowLoading = isSavedView ? !hasHydrated : isLoading;
  const shouldShowError = !isSavedView && Boolean(errorMessage);
  const pageLabel = isSavedView
    ? "Saved on this device"
    : pagination.totalPages > 1
      ? `Page ${pagination.currentPage} of ${pagination.totalPages}`
      : "Single page";

  const clearSingleFilter = (key) => {
    const nextFilters = { ...appliedFilters, [key]: "" };
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPagination((current) => ({ ...current, currentPage: 1 }));
  };

  const applyQuickFilter = (key, value) => {
    const nextFilters = { ...appliedFilters, [key]: value };
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPagination((current) => ({ ...current, currentPage: 1 }));
    setIsFiltersOpen(false);
  };

  const switchView = (nextView) => {
    router.replace(nextView === "saved" ? `${pathname}?view=saved` : pathname, { scroll: false });
    setPagination((current) => ({ ...current, currentPage: 1 }));
  };

  return (
    <section className="space-y-6">
      <div className="ui-surface p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Browse Books</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              {isSavedView ? "Revisit your saved books" : "Find books from the community"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {isSavedView
                ? "Saved books are stored on this device only, so you can quickly revisit listings you want to compare or request later."
                : "Search by title or author, then narrow the catalog with the category and location filters already built into the flow."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100">
              {resultLabel}
            </div>
            <Link href="/request-book" className="ui-btn-secondary w-full sm:inline-flex sm:w-auto">
              Request a Book
            </Link>
          </div>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleApplyFilters}>
          <div className="flex flex-wrap gap-2">
            <ViewToggleButton
              isActive={!isSavedView}
              label="All books"
              detail={getResultLabel(pagination.totalBooks)}
              onClick={() => switchView("all")}
            />
            <ViewToggleButton
              isActive={isSavedView}
              label="Saved"
              detail={
                hasHydrated
                  ? `${savedCount} book${savedCount === 1 ? "" : "s"} on this device`
                  : "Loading saved books"
              }
              onClick={() => switchView("saved")}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">Search books</span>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                name="search"
                value={draftFilters.search}
                onChange={handleFilterChange}
                placeholder="Search by title or author name"
                className="ui-input min-h-14 rounded-[1.6rem] pl-12 pr-14 text-base"
              />
              <button
                type="submit"
                aria-label="Search books"
                className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-slate-700"
              >
                <ArrowIcon className="h-4 w-4" />
              </button>
            </label>

            <button
              type="button"
              onClick={() => setIsFiltersOpen((current) => !current)}
              aria-expanded={isFiltersOpen}
              className={`relative inline-flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-[1.3rem] border px-4 text-sm font-semibold transition sm:w-auto ${
                isFiltersOpen || activeFilterCount > 0
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FilterIcon className="h-5 w-5" />
              <span>Filters</span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">
              {isSavedView
                ? "Saved view filters your locally saved books by title, author, category, and location."
                : "Search helps with titles and authors. Use filters to narrow by category or location."}
            </p>
            {hasPendingChanges ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Search changes not applied yet
              </span>
            ) : null}
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isFiltersOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="ui-subtle-card space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
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
                  <button type="submit" className="ui-btn-primary w-full">
                    Apply filters
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="ui-btn-secondary w-full"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {(quickCategories.length > 0 || quickLocations.length > 0) && !shouldShowLoading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {quickCategories.length > 0 ? (
                    <QuickFilterGroup
                      title="Browse by category"
                      subtitle="Quick picks from the current results"
                      options={quickCategories}
                      activeValue={appliedFilters.category.trim()}
                      onSelect={(value) => applyQuickFilter("category", value)}
                    />
                  ) : null}
                  {quickLocations.length > 0 ? (
                    <QuickFilterGroup
                      title="Browse by location"
                      subtitle="Places showing up in this result set"
                      options={quickLocations}
                      activeValue={appliedFilters.location.trim()}
                      onSelect={(value) => applyQuickFilter("location", value)}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="ui-results-panel">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
                    Active view
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                    {getResultsHeading(appliedFilters, totalResults, isSavedView)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {isSavedView
                      ? `${visibleCount} saved book${visibleCount === 1 ? "" : "s"} match the filters on this device.`
                      : `${visibleCount} shown on this page. Adjust search or filters any time without changing the current browse flow.`}
                  </p>
                </div>
                <button type="button" onClick={handleResetFilters} className="ui-btn-secondary">
                  Clear all filters
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <ActivePill
                    key={filter.key}
                    label={filter.label}
                    onClear={() => clearSingleFilter(filter.key)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </form>
      </div>

      {shouldShowLoading ? (
        <LoadingState />
      ) : shouldShowError ? (
        <ErrorState message={errorMessage} />
      ) : displayedBooks.length === 0 ? (
        <EmptyState
          hasActiveFilters={hasActiveFilters}
          isSavedView={isSavedView}
          onClearFilters={handleResetFilters}
          onSwitchView={() => switchView("all")}
        />
      ) : (
        <>
          <div className="ui-results-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
                  Results
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {hasActiveFilters
                    ? getResultsHeading(appliedFilters, totalResults, isSavedView)
                    : isSavedView
                      ? "Saved books ready to revisit"
                      : "Explore the latest matching listings"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {isSavedView
                    ? "This view is powered entirely by books you saved in this browser, so it is useful for shortlists and later comparison."
                    : hasActiveFilters
                      ? "These listings match the filters currently applied above."
                      : "Browse the current catalog, then narrow the view with search, category, or location when you need to."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ResultsStat label={isSavedView ? "Saved matches" : "Total matches"} value={String(totalResults)} />
                <ResultsStat label="Shown now" value={String(visibleCount)} />
                <ResultsStat label="Browse state" value={pageLabel} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          {!isSavedView ? (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(nextPage) =>
                setPagination((current) => ({ ...current, currentPage: nextPage }))
              }
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function FilterInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input {...props} className="ui-input" />
    </label>
  );
}

function ActivePill({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span>{label}</span>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[11px] uppercase text-slate-500">
        x
      </span>
    </button>
  );
}

function ViewToggleButton({ isActive, label, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-12 items-center gap-3 rounded-[1.3rem] border px-4 py-3 text-left transition ${
        isActive
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{detail}</span>
    </button>
  );
}

function QuickFilterGroup({ title, subtitle, options, activeValue, onSelect }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = activeValue === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultsStat({ label, value }) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200/80 bg-white/84 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="ui-skeleton-card">
          <div className="ui-skeleton h-56 rounded-[1.7rem]" />
          <div className="mt-5 space-y-3">
            <div className="ui-skeleton-line w-24" />
            <div className="ui-skeleton-title w-4/5" />
            <div className="ui-skeleton-line w-2/3" />
          </div>
          <div className="ui-skeleton-panel mt-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="ui-skeleton-line w-20" />
                <div className="ui-skeleton-line w-28" />
              </div>
              <div className="ui-skeleton h-12 w-20 rounded-2xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-skeleton h-16 rounded-[1.1rem]" />
              <div className="ui-skeleton h-16 rounded-[1.1rem]" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-200/80 pt-4">
            <div className="ui-skeleton-line w-24" />
            <div className="ui-skeleton-line w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="ui-feedback-error ui-feedback-panel">
      <h2 className="ui-feedback-title">Unable to load books</h2>
      <p className="ui-feedback-body">{message}</p>
    </div>
  );
}

function EmptyState({ hasActiveFilters, isSavedView, onClearFilters, onSwitchView }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">
        {isSavedView ? "No saved books yet" : "No books found"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isSavedView
          ? hasActiveFilters
            ? "No saved books match the filters right now. Try clearing filters or switch back to all books to keep browsing."
            : "Save books from browse cards or the details page and they will appear here on this device for easy revisit later."
          : hasActiveFilters
            ? "Try removing one of your active filters, broadening the search term, or resetting the browse view to see more listings."
            : "Try a broader title or author search, adjust category or location, or check back after more listings are added."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {hasActiveFilters ? (
          <button type="button" onClick={onClearFilters} className="ui-btn-secondary">
            Clear filters
          </button>
        ) : null}
        {isSavedView ? (
          <button type="button" onClick={onSwitchView} className="ui-btn-secondary">
            Browse all books
          </button>
        ) : null}
        <Link href="/request-book" className="ui-btn-primary">
          Can&apos;t find your book? Request it
        </Link>
      </div>
    </div>
  );
}

function getResultLabel(totalBooks) {
  return `${totalBooks} book${totalBooks === 1 ? "" : "s"} found`;
}

function getResultsHeading(filters, totalBooks, isSavedView = false) {
  const search = filters.search.trim();
  const category = filters.category.trim();
  const location = filters.location.trim();
  const noun = isSavedView ? "saved books" : "books";
  const matchLabel = isSavedView ? "saved matches" : "matches";

  if (search && category && location) {
    return `${totalBooks} ${matchLabel} for "${search}" in ${category} near ${location}`;
  }

  if (search && category) {
    return `${totalBooks} ${matchLabel} for "${search}" in ${category}`;
  }

  if (search && location) {
    return `${totalBooks} ${matchLabel} for "${search}" near ${location}`;
  }

  if (category && location) {
    return `${totalBooks} ${noun} in ${category} near ${location}`;
  }

  if (search) {
    return `${totalBooks} ${matchLabel} for "${search}"`;
  }

  if (category) {
    return `${totalBooks} ${noun} in ${category}`;
  }

  if (location) {
    return `${totalBooks} ${noun} near ${location}`;
  }

  return isSavedView ? `${totalBooks} saved book${totalBooks === 1 ? "" : "s"}` : getResultLabel(totalBooks);
}

function filterSavedBooks(savedBooks, filters) {
  const search = filters.search.trim().toLowerCase();
  const category = filters.category.trim().toLowerCase();
  const location = filters.location.trim().toLowerCase();

  return savedBooks.filter((book) => {
    const title = String(book.title || "").toLowerCase();
    const author = String(book.author || "").toLowerCase();
    const bookCategory = String(book.category || "").toLowerCase();
    const bookLocation = String(book.location || "").toLowerCase();

    if (search && !title.includes(search) && !author.includes(search)) {
      return false;
    }

    if (category && bookCategory !== category) {
      return false;
    }

    if (location && bookLocation !== location) {
      return false;
    }

    return true;
  });
}

function SearchIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="m14.5 14.5 3.25 3.25M8.75 15.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FilterIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M3 5h14M5.5 10h9M8 15h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M4.5 10h11m0 0-4-4m4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-sm sm:gap-3">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="ui-pill-nav bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
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
        className="ui-pill-nav bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
