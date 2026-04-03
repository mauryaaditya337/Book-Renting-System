"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BookCard } from "@/components/BookCard";
import { apiRequest } from "@/lib/api";
import { enrichBooksWithDistance, getStoredUserLocation, requestBrowserLocation } from "@/lib/location";
import { useSavedBooks } from "@/lib/savedBooks";

const BooksBrowseMap = dynamic(
  () => import("@/components/BooksBrowseMap").then((module) => module.BooksBrowseMap),
  { ssr: false, loading: () => <div className="rounded-[1.9rem] border border-white/70 bg-white/90 p-6 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">Loading map...</div> }
);

const PAGE_LIMIT = 6;
const DISTANCE_FILTER_OPTIONS = ["any", "2", "5", "10", "20"];
const initialFilters = { search: "", category: "", location: "" };

export function BooksBrowse({ initialView = "all" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [browseMode, setBrowseMode] = useState("list");
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [distanceFilterKm, setDistanceFilterKm] = useState("any");
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalBooks: 0 });
  const { savedBooks, savedCount, hasHydrated } = useSavedBooks();
  const isSavedView = initialView === "saved";
  const canUseLocationFeatures = !isSavedView && Boolean(userLocation);
  const activeRadiusKm = canUseLocationFeatures && distanceFilterKm !== "any" ? Number(distanceFilterKm) : null;

  useEffect(() => {
    if (isSavedView) {
      setBrowseMode("list");
      setNearMeEnabled(false);
      setDistanceFilterKm("any");
    }
  }, [isSavedView]);

  const queryString = useMemo(() => buildQueryString({
    appliedFilters,
    currentPage: pagination.currentPage,
    isSavedView,
    nearMeEnabled,
    userLocation
  }), [appliedFilters, isSavedView, nearMeEnabled, pagination.currentPage, userLocation]);

  useEffect(() => {
    const storedLocation = getStoredUserLocation();
    if (storedLocation) {
      setUserLocation(storedLocation);
      setNearMeEnabled(true);
    }
    requestBrowserLocation().then((currentLocation) => {
      setUserLocation(currentLocation);
      setNearMeEnabled(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let isActive = true;
    async function loadBooks() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await apiRequest(`/books?${queryString}`, { cache: "no-store" });
        if (!isActive) return;
        setBooks(data.books || []);
        setPagination((current) => ({ ...current, currentPage: Number(data.currentPage) || 1, totalPages: Number(data.totalPages) || 1, totalBooks: Number(data.totalBooks) || 0 }));
      } catch (error) {
        if (!isActive) return;
        setBooks([]);
        setErrorMessage(error.message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    loadBooks();
    return () => {
      isActive = false;
    };
  }, [queryString]);

  const filteredSavedBooks = useMemo(() => filterSavedBooks(savedBooks, appliedFilters), [savedBooks, appliedFilters]);
  const sourceBooks = isSavedView ? filteredSavedBooks : books;
  const displayedBooks = useMemo(() => getDisplayedBooks({ sourceBooks, userLocation, nearMeEnabled, canUseLocationFeatures, activeRadiusKm }), [activeRadiusKm, canUseLocationFeatures, nearMeEnabled, sourceBooks, userLocation]);
  const mappableBooks = useMemo(() => displayedBooks.filter(hasCoordinates), [displayedBooks]);
  const quickCategories = useMemo(() => collectQuickOptions(displayedBooks, "category", 5), [displayedBooks]);
  const quickLocations = useMemo(() => collectQuickOptions(displayedBooks, "location", 4), [displayedBooks]);
  const visibleCount = displayedBooks.length;
  const totalResults = isSavedView ? filteredSavedBooks.length : pagination.totalBooks;
  const resultLabel = isSavedView ? `${totalResults} saved book${totalResults === 1 ? "" : "s"}` : getResultLabel(totalResults);
  const activeFilters = getActiveFilters({ appliedFilters, nearMeEnabled, canUseLocationFeatures, activeRadiusKm });
  const hasActiveFilters = activeFilters.length > 0;
  const hasPendingChanges = draftFilters.search !== appliedFilters.search || draftFilters.category !== appliedFilters.category || draftFilters.location !== appliedFilters.location;
  const shouldShowLoading = isSavedView ? !hasHydrated : isLoading;
  const shouldShowError = !isSavedView && Boolean(errorMessage);
  const shouldShowResultStrip = hasActiveFilters || Boolean(appliedFilters.search.trim()) || isSavedView;
  const pageLabel = isSavedView ? "Saved on this device" : pagination.totalPages > 1 ? `Page ${pagination.currentPage} of ${pagination.totalPages}` : "Single page";
  const clearSingleFilter = (key) => {
    if (key === "nearMe") {
      setNearMeEnabled(false);
    } else if (key === "radius") {
      setDistanceFilterKm("any");
    } else {
      const nextFilters = { ...appliedFilters, [key]: "" };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    }
    setPagination((current) => ({ ...current, currentPage: 1 }));
  };

  return (
    <section className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="ui-surface p-3.5 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-teal-700">Browse Books</p>
            <h1 className="mt-0.5 text-[1.55rem] font-semibold text-slate-900 sm:mt-1 md:text-[1.85rem] lg:text-[2rem]">{isSavedView ? "Revisit your saved books" : "Find books from the community"}</h1>
            {isSavedView ? <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">Saved books stay on this device so you can quickly revisit listings later.</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {isSavedView ? <div className="hidden rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 md:inline-flex">{resultLabel}</div> : null}
            <Link href="/request-book" className="ui-btn-secondary w-full md:inline-flex md:w-auto md:px-4 md:py-2.5">Request a Book</Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ViewToggleButton isActive={!isSavedView} label="All books" detail={isSavedView ? "Browse" : getResultLabel(pagination.totalBooks)} onClick={() => switchView(router, pathname, "all", setPagination)} />
          <ViewToggleButton isActive={isSavedView} label="Saved" detail={hasHydrated ? `${savedCount} book${savedCount === 1 ? "" : "s"} on this device` : "Loading saved books"} onClick={() => switchView(router, pathname, "saved", setPagination)} />
        </div>

        <form className="mt-3 space-y-2.5 sm:mt-3.5 sm:space-y-3" onSubmit={(event) => applyFilters(event, draftFilters, setAppliedFilters, setPagination)}>
          <div className="book-browse-search-row flex items-center gap-2 sm:gap-2.5">
            <label className="relative block flex-1">
              <span className="sr-only">Search books</span>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input name="search" value={draftFilters.search} onChange={(event) => handleDraftFilterChange(event, setDraftFilters)} placeholder="Search by title or author name" className="ui-input min-h-11 rounded-[1.15rem] border-white/80 bg-white/92 pl-11 pr-11 text-sm shadow-[0_8px_22px_rgba(15,23,42,0.04)] md:min-h-12 md:rounded-[1.25rem]" />
              <button type="submit" aria-label="Search books" className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[0.95rem] bg-slate-900 text-white transition hover:bg-slate-700">
                <ArrowIcon className="h-4 w-4" />
              </button>
            </label>
            <button type="button" onClick={() => setIsFiltersOpen((current) => !current)} aria-expanded={isFiltersOpen} className={`relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[1.05rem] border px-3 text-sm font-semibold transition md:px-3.5 ${isFiltersOpen || activeFilters.length > 0 ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <FilterIcon className="h-5 w-5" />
              <span>Filters</span>
              {activeFilters.length > 0 ? <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">{activeFilters.length}</span> : null}
            </button>
          </div>

          {!isSavedView ? (
            <div className="grid gap-2.5 lg:grid-cols-[auto_auto_auto_minmax(0,1fr)]">
              <div className="rounded-[1.2rem] border border-slate-200/80 bg-white/86 p-1 shadow-sm">
                <div className="grid grid-cols-2 gap-1">
                  <ModeToggleButton isActive={browseMode === "list"} label="List View" onClick={() => setBrowseMode("list")} />
                  <ModeToggleButton isActive={browseMode === "map"} label="Map View" onClick={() => setBrowseMode("map")} />
                </div>
              </div>
              <TogglePill label="Near me" detail={canUseLocationFeatures ? "Nearest first" : "Location needed"} isActive={nearMeEnabled && canUseLocationFeatures} disabled={!canUseLocationFeatures} onClick={() => {
                if (!canUseLocationFeatures) return;
                setNearMeEnabled((current) => !current);
                setPagination((current) => ({ ...current, currentPage: 1 }));
              }} />
              <label className="flex min-h-11 items-center gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white/86 px-3.5 py-2 text-sm shadow-sm">
                <span className="font-medium text-slate-700">Radius</span>
                <select value={distanceFilterKm} onChange={(event) => {
                  setDistanceFilterKm(event.target.value);
                  setPagination((current) => ({ ...current, currentPage: 1 }));
                }} disabled={!canUseLocationFeatures} className="min-w-24 bg-transparent text-sm font-semibold text-slate-900 outline-none disabled:text-slate-400">
                  {DISTANCE_FILTER_OPTIONS.map((option) => <option key={option} value={option}>{option === "any" ? "Any" : `${option} km`}</option>)}
                </select>
              </label>
              <div className="flex items-center rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm text-slate-600">
                {getLocationSummary({ canUseLocationFeatures, nearMeEnabled, activeRadiusKm })}
              </div>
            </div>
          ) : null}

          <div className="flex min-h-4 items-center justify-between gap-2">
            <p className="hidden text-sm leading-5 text-slate-600 md:block">{isSavedView ? "Search and filter your saved books." : browseMode === "map" ? "Use the map to inspect pickup spots and open listing details from marker popups." : nearMeEnabled && canUseLocationFeatures ? "Near me is on, so books with coordinates are prioritized by distance." : "Search first, then narrow by category, location, or map controls if needed."}</p>
            {hasPendingChanges ? <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Pending changes</span> : null}
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-out ${isFiltersOpen ? "max-h-[30rem] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="ui-subtle-card space-y-3 p-3.5 sm:space-y-4 sm:p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                <FilterInput label="Category" name="category" value={draftFilters.category} onChange={(event) => handleDraftFilterChange(event, setDraftFilters)} placeholder="Programming" />
                <FilterInput label="Location" name="location" value={draftFilters.location} onChange={(event) => handleDraftFilterChange(event, setDraftFilters)} placeholder="Pune" />
                <div className="flex flex-col gap-2.5 md:flex-row xl:flex-col">
                  <button type="submit" className="ui-btn-primary w-full">Apply filters</button>
                  <button type="button" onClick={() => resetFilters({ isSavedView, userLocation, setDraftFilters, setAppliedFilters, setNearMeEnabled, setDistanceFilterKm, setPagination, setIsFiltersOpen })} className="ui-btn-secondary w-full">Clear all</button>
                </div>
              </div>
              {(quickCategories.length > 0 || quickLocations.length > 0) && !shouldShowLoading ? <div className="grid gap-3 xl:grid-cols-2">{quickCategories.length > 0 ? <QuickFilterGroup title="Browse by category" subtitle="Quick picks from the current results" options={quickCategories} activeValue={appliedFilters.category.trim()} onSelect={(value) => applyQuickFilter(value, "category", appliedFilters, setDraftFilters, setAppliedFilters, setPagination, setIsFiltersOpen)} /> : null}{quickLocations.length > 0 ? <QuickFilterGroup title="Browse by location" subtitle="Places showing up in this result set" options={quickLocations} activeValue={appliedFilters.location.trim()} onSelect={(value) => applyQuickFilter(value, "location", appliedFilters, setDraftFilters, setAppliedFilters, setPagination, setIsFiltersOpen)} /> : null}</div> : null}
            </div>
          </div>

          {shouldShowResultStrip ? <ResultStrip activeFilters={activeFilters} appliedFilters={appliedFilters} browseMode={browseMode} canUseLocationFeatures={canUseLocationFeatures} clearSingleFilter={clearSingleFilter} isSavedView={isSavedView} mappableBooks={mappableBooks} pageLabel={pageLabel} pagination={pagination} resultLabel={resultLabel} setDistanceFilterKm={setDistanceFilterKm} setDraftFilters={setDraftFilters} setAppliedFilters={setAppliedFilters} setNearMeEnabled={setNearMeEnabled} setPagination={setPagination} visibleCount={visibleCount} activeRadiusKm={activeRadiusKm} userLocation={userLocation} /> : null}
        </form>
      </div>

      {shouldShowLoading ? <LoadingState /> : shouldShowError ? <ErrorState message={errorMessage} /> : displayedBooks.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} isSavedView={isSavedView} onClearFilters={() => resetFilters({ isSavedView, userLocation, setDraftFilters, setAppliedFilters, setNearMeEnabled, setDistanceFilterKm, setPagination, setIsFiltersOpen })} onSwitchView={() => switchView(router, pathname, "all", setPagination)} />
      ) : browseMode === "map" && !isSavedView ? (
        <div className="space-y-4">
          <BooksBrowseMap books={mappableBooks} userLocation={canUseLocationFeatures ? userLocation : null} radiusKm={activeRadiusKm} />
          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard title="Mapped books" value={`${mappableBooks.length}`} detail="These listings show as markers because they include valid pickup coordinates." />
            <InsightCard title="Without coordinates" value={`${visibleCount - mappableBooks.length}`} detail="These books still stay available in list view and never break browse." />
            <InsightCard title="Location context" value={canUseLocationFeatures ? "Enabled" : "Unavailable"} detail={canUseLocationFeatures ? activeRadiusKm != null ? `Near me and the ${activeRadiusKm} km radius are active on the current result set.` : "Your browser location is available for popups, sorting, and optional radius filtering." : "Grant browser location to add your marker and unlock near-me filtering."} />
          </div>
        </div>
      ) : (
        <>
          {shouldShowResultStrip ? <div className="book-browse-results-meta"><span>{isSavedView ? "Saved view" : "Results"}</span><span>{resultLabel}</span><span>{pageLabel}</span></div> : null}
          <div className="book-browse-results grid gap-3 md:gap-4">{displayedBooks.map((book) => <BookCard key={book.id} book={book} />)}</div>
          {!isSavedView && browseMode === "list" ? <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={(nextPage) => setPagination((current) => ({ ...current, currentPage: nextPage }))} /> : null}
        </>
      )}
    </section>
  );
}

function ResultStrip({
  activeFilters,
  appliedFilters,
  browseMode,
  canUseLocationFeatures,
  clearSingleFilter,
  isSavedView,
  mappableBooks,
  pageLabel,
  pagination,
  resultLabel,
  setDistanceFilterKm,
  setDraftFilters,
  setAppliedFilters,
  setNearMeEnabled,
  setPagination,
  visibleCount,
  activeRadiusKm,
  userLocation
}) {
  return (
    <div className="book-browse-strip">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {activeFilters.length > 0 || appliedFilters.search.trim()
            ? getResultsHeading(appliedFilters, visibleCount, isSavedView)
            : isSavedView
              ? resultLabel
              : browseMode === "map"
                ? `${mappableBooks.length} mapped`
                : canUseLocationFeatures
                  ? `${visibleCount} shown`
                  : `${visibleCount} shown`}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
          {isSavedView
            ? `${visibleCount} visible in saved view`
            : `${visibleCount} shown${browseMode === "map" ? ` | ${mappableBooks.length} with coordinates` : ""}${canUseLocationFeatures ? "" : " | Book markers only"}${activeRadiusKm != null ? ` | Within ${activeRadiusKm} km` : ""}${browseMode === "list" && pagination.totalPages > 1 ? ` | ${pageLabel}` : ""}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {activeFilters.map((filter) => <ActivePill key={filter.key} label={filter.label} onClear={() => clearSingleFilter(filter.key)} />)}
        {activeFilters.length > 0 ? <button type="button" onClick={() => resetFilters({ isSavedView, userLocation, setDraftFilters, setAppliedFilters, setNearMeEnabled, setDistanceFilterKm, setPagination, setIsFiltersOpen: () => {} })} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-50 sm:px-3 sm:py-1.5 sm:text-xs">Clear all</button> : null}
      </div>
    </div>
  );
}

function FilterInput({ label, ...props }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><input {...props} className="ui-input" /></label>;
}

function ActivePill({ label, onClear }) {
  return <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs"><span>{label}</span><span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[11px] uppercase text-slate-500">x</span></button>;
}

function ViewToggleButton({ isActive, label, detail, onClick }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-[1rem] border px-3 py-2 text-left transition sm:min-h-11 sm:rounded-[1.1rem] sm:py-2.5 ${isActive ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}><span className="text-sm font-semibold">{label}</span><span className={`hidden text-xs md:inline ${isActive ? "text-slate-300" : "text-slate-500"}`}>{detail}</span></button>;
}

function ModeToggleButton({ isActive, label, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-[0.95rem] px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>{label}</button>;
}

function TogglePill({ label, detail, isActive, disabled, onClick }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`flex min-h-11 items-center gap-3 rounded-[1.2rem] border px-3.5 py-2 text-left shadow-sm transition ${isActive ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200/80 bg-white/86 text-slate-700 hover:bg-slate-50"} ${disabled ? "cursor-not-allowed opacity-60 hover:bg-white/86" : ""}`}><span className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition ${isActive ? "bg-teal-700" : "bg-slate-300"}`}><span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${isActive ? "translate-x-4" : "translate-x-0"}`} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block text-[11px] text-slate-500">{detail}</span></span></button>;
}

function QuickFilterGroup({ title, subtitle, options, activeValue, onSelect }) {
  return <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/80 p-3.5 shadow-sm sm:rounded-[1.35rem] sm:p-4"><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-[11px] leading-5 text-slate-500 sm:mt-1 sm:text-xs sm:leading-5">{subtitle}</p></div><div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">{options.map((option) => <button key={option} type="button" onClick={() => onSelect(option)} className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition sm:px-3.5 sm:py-2 ${activeValue === option ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}>{option}</button>)}</div></div>;
}

function InsightCard({ title, value, detail }) {
  return <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></div>;
}

function LoadingState() {
  return <div className="book-browse-results grid gap-3 md:gap-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="ui-skeleton-card p-3 md:p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4"><div className="ui-skeleton h-36 w-full rounded-[1.2rem] md:h-36 md:w-28" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1 space-y-2"><div className="ui-skeleton-line w-20" /><div className="ui-skeleton-title w-4/5" /><div className="ui-skeleton-line w-2/3" /></div><div className="ui-skeleton h-14 w-28 rounded-[1rem]" /></div></div></div></div>)}</div>;
}

function ErrorState({ message }) {
  return <div className="ui-feedback-error ui-feedback-panel"><h2 className="ui-feedback-title">Unable to load books</h2><p className="ui-feedback-body">{message}</p></div>;
}

function EmptyState({ hasActiveFilters, isSavedView, onClearFilters, onSwitchView }) {
  return <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm"><h2 className="text-2xl font-semibold text-slate-900">{isSavedView ? "No saved books yet" : "No books found"}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{isSavedView ? hasActiveFilters ? "No saved books match the filters right now. Try clearing filters or switch back to all books to keep browsing." : "Save books from browse cards or the details page and they will appear here on this device for easy revisit later." : hasActiveFilters ? "Try removing one of your active filters, broadening the search term, or resetting the browse view to see more listings." : "Try a broader title or author search, adjust category or location, or check back after more listings are added."}</p><div className="mt-5 flex flex-wrap justify-center gap-3">{hasActiveFilters ? <button type="button" onClick={onClearFilters} className="ui-btn-secondary">Clear filters</button> : null}{isSavedView ? <button type="button" onClick={onSwitchView} className="ui-btn-secondary">Browse all books</button> : null}<Link href="/request-book" className="ui-btn-primary">Can&apos;t find your book? Request it</Link></div></div>;
}

function buildQueryString({ appliedFilters, currentPage, isSavedView, nearMeEnabled, userLocation }) {
  const params = new URLSearchParams();
  if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim());
  if (appliedFilters.category.trim()) params.set("category", appliedFilters.category.trim());
  if (appliedFilters.location.trim()) params.set("location", appliedFilters.location.trim());
  params.set("page", String(currentPage));
  params.set("limit", String(PAGE_LIMIT));
  if (!isSavedView && nearMeEnabled && userLocation?.latitude != null && userLocation?.longitude != null) {
    params.set("sortBy", "distance");
    params.set("latitude", String(userLocation.latitude));
    params.set("longitude", String(userLocation.longitude));
  }
  return params.toString();
}

function getDisplayedBooks({ sourceBooks, userLocation, nearMeEnabled, canUseLocationFeatures, activeRadiusKm }) {
  let nextBooks = enrichBooksWithDistance(sourceBooks, userLocation);
  if (activeRadiusKm != null) nextBooks = nextBooks.filter((book) => book.distanceKm != null && book.distanceKm <= activeRadiusKm);
  if (nearMeEnabled && canUseLocationFeatures) nextBooks = [...nextBooks].sort(compareByDistance);
  return nextBooks;
}

function getActiveFilters({ appliedFilters, nearMeEnabled, canUseLocationFeatures, activeRadiusKm }) {
  return [
    appliedFilters.search.trim() ? { key: "search", label: `Search: ${appliedFilters.search.trim()}` } : null,
    appliedFilters.category.trim() ? { key: "category", label: `Category: ${appliedFilters.category.trim()}` } : null,
    appliedFilters.location.trim() ? { key: "location", label: `Location: ${appliedFilters.location.trim()}` } : null,
    nearMeEnabled && canUseLocationFeatures ? { key: "nearMe", label: "Near me" } : null,
    activeRadiusKm != null ? { key: "radius", label: `Within ${activeRadiusKm} km` } : null
  ].filter(Boolean);
}

function handleDraftFilterChange(event, setDraftFilters) {
  const { name, value } = event.target;
  setDraftFilters((current) => ({ ...current, [name]: value }));
}

function applyFilters(event, draftFilters, setAppliedFilters, setPagination) {
  event.preventDefault();
  setAppliedFilters(draftFilters);
  setPagination((current) => ({ ...current, currentPage: 1 }));
}

function applyQuickFilter(value, key, appliedFilters, setDraftFilters, setAppliedFilters, setPagination, setIsFiltersOpen) {
  const nextFilters = { ...appliedFilters, [key]: value };
  setDraftFilters(nextFilters);
  setAppliedFilters(nextFilters);
  setPagination((current) => ({ ...current, currentPage: 1 }));
  setIsFiltersOpen(false);
}

function resetFilters({ isSavedView, userLocation, setDraftFilters, setAppliedFilters, setNearMeEnabled, setDistanceFilterKm, setPagination, setIsFiltersOpen }) {
  setDraftFilters(initialFilters);
  setAppliedFilters(initialFilters);
  setNearMeEnabled(Boolean(userLocation) && !isSavedView);
  setDistanceFilterKm("any");
  setPagination((current) => ({ ...current, currentPage: 1 }));
  setIsFiltersOpen(false);
}

function switchView(router, pathname, nextView, setPagination) {
  router.replace(nextView === "saved" ? `${pathname}?view=saved` : pathname, { scroll: false });
  setPagination((current) => ({ ...current, currentPage: 1 }));
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
  if (search && category && location) return `${totalBooks} ${matchLabel} for "${search}" in ${category} near ${location}`;
  if (search && category) return `${totalBooks} ${matchLabel} for "${search}" in ${category}`;
  if (search && location) return `${totalBooks} ${matchLabel} for "${search}" near ${location}`;
  if (category && location) return `${totalBooks} ${noun} in ${category} near ${location}`;
  if (search) return `${totalBooks} ${matchLabel} for "${search}"`;
  if (category) return `${totalBooks} ${noun} in ${category}`;
  if (location) return `${totalBooks} ${noun} near ${location}`;
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
    if (search && !title.includes(search) && !author.includes(search)) return false;
    if (category && bookCategory !== category) return false;
    if (location && bookLocation !== location) return false;
    return true;
  });
}

function collectQuickOptions(books, field, limit) {
  const counts = new Map();
  books.forEach((book) => {
    const value = book[field]?.trim();
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([value]) => value);
}

function compareByDistance(left, right) {
  if (left.distanceKm == null && right.distanceKm == null) return 0;
  if (left.distanceKm == null) return 1;
  if (right.distanceKm == null) return -1;
  return left.distanceKm - right.distanceKm;
}

function hasCoordinates(book) {
  return Number.isFinite(book.latitude) && Number.isFinite(book.longitude) && book.latitude >= -90 && book.latitude <= 90 && book.longitude >= -180 && book.longitude <= 180;
}

function getLocationSummary({ canUseLocationFeatures, nearMeEnabled, activeRadiusKm }) {
  if (!canUseLocationFeatures) return "Location not available yet. Map markers still work with book pickup coordinates.";
  if (nearMeEnabled && activeRadiusKm != null) return `Showing books within ${activeRadiusKm} km of your current location.`;
  if (nearMeEnabled) return "Nearby books are prioritized using your current location.";
  if (activeRadiusKm != null) return `Showing books within ${activeRadiusKm} km where distance is available.`;
  return "Turn on Near me or choose a radius to add location-based filtering.";
}

function SearchIcon({ className = "" }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className={className}><path d="m14.5 14.5 3.25 3.25M8.75 15.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function FilterIcon({ className = "" }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className={className}><path d="M3 5h14M5.5 10h9M8 15h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function ArrowIcon({ className = "" }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className={className}><path d="M4.5 10h11m0 0-4-4m4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return <div className="flex flex-wrap items-center justify-center gap-2 rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-sm sm:gap-3"><button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="ui-pill-nav bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>{pages.map((page) => <button key={page} type="button" onClick={() => onPageChange(page)} className={`h-10 w-10 rounded-full text-sm font-medium transition ${currentPage === page ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{page}</button>)}<button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className="ui-pill-nav bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">Next</button></div>;
}
