"use client";

import { useEffect, useMemo, useState } from "react";

import { getBookImages, getPrimaryBookImage } from "@/lib/bookImages";

const STORAGE_KEY = "bookrent.saved-books.v1";
const CHANGE_EVENT = "bookrent:saved-books-changed";

function createEmptyState() {
  return {
    ids: [],
    booksById: {}
  };
}

function normalizeBookSnapshot(book) {
  const id = String(book?.id || book?._id || "").trim();

  if (!id) {
    return null;
  }

  const images = getBookImages(book);

  return {
    id,
    title: book?.title || "Untitled book",
    author: book?.author || "Unknown author",
    category: book?.category || "",
    location: book?.location || "",
    availabilityStatus: book?.availabilityStatus || "available",
    listingType: book?.listingType || "rent",
    condition: book?.condition || "",
    rentalPrice: Number(book?.rentalPrice || 0),
    salePrice: Number(book?.salePrice || 0),
    securityDeposit: Number(book?.securityDeposit || 0),
    imageUrl: getPrimaryBookImage(book),
    images,
    savedAt: new Date().toISOString()
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSavedBooksState() {
  if (!canUseStorage()) {
    return createEmptyState();
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createEmptyState();
    }

    const parsedValue = JSON.parse(rawValue);
    const ids = Array.isArray(parsedValue?.ids)
      ? parsedValue.ids.map((id) => String(id)).filter(Boolean)
      : [];
    const booksById =
      parsedValue?.booksById && typeof parsedValue.booksById === "object" ? parsedValue.booksById : {};

    return { ids, booksById };
  } catch {
    return createEmptyState();
  }
}

function writeSavedBooksState(nextState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveBookToStorage(book) {
  const snapshot = normalizeBookSnapshot(book);

  if (!snapshot) {
    return false;
  }

  const currentState = readSavedBooksState();
  const nextIds = [snapshot.id, ...currentState.ids.filter((id) => id !== snapshot.id)];

  writeSavedBooksState({
    ids: nextIds,
    booksById: {
      ...currentState.booksById,
      [snapshot.id]: {
        ...currentState.booksById[snapshot.id],
        ...snapshot
      }
    }
  });

  return true;
}

export function removeSavedBookFromStorage(bookId) {
  const normalizedId = String(bookId || "").trim();

  if (!normalizedId) {
    return false;
  }

  const currentState = readSavedBooksState();

  if (!currentState.ids.includes(normalizedId)) {
    return false;
  }

  const nextBooksById = { ...currentState.booksById };
  delete nextBooksById[normalizedId];

  writeSavedBooksState({
    ids: currentState.ids.filter((id) => id !== normalizedId),
    booksById: nextBooksById
  });

  return true;
}

export function toggleSavedBookInStorage(book) {
  const normalizedId = String(book?.id || book?._id || "").trim();

  if (!normalizedId) {
    return false;
  }

  const currentState = readSavedBooksState();

  if (currentState.ids.includes(normalizedId)) {
    removeSavedBookFromStorage(normalizedId);
    return false;
  }

  saveBookToStorage(book);
  return true;
}

export function useSavedBooks() {
  const [savedState, setSavedState] = useState(createEmptyState());
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (!canUseStorage()) {
      setHasHydrated(true);
      return undefined;
    }

    const syncState = () => {
      setSavedState(readSavedBooksState());
      setHasHydrated(true);
    };

    syncState();

    const handleStorage = (event) => {
      if (event.key && event.key !== STORAGE_KEY) {
        return;
      }

      syncState();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHANGE_EVENT, syncState);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHANGE_EVENT, syncState);
    };
  }, []);

  const savedBooks = useMemo(
    () =>
      savedState.ids
        .map((id) => savedState.booksById[id])
        .filter(Boolean),
    [savedState]
  );

  const savedBookIds = useMemo(() => new Set(savedState.ids), [savedState.ids]);

  return {
    hasHydrated,
    savedBooks,
    savedBookIds,
    savedCount: savedBooks.length,
    isBookSaved: (bookId) => savedBookIds.has(String(bookId || "").trim()),
    saveBook: saveBookToStorage,
    removeBook: removeSavedBookFromStorage,
    toggleBook: toggleSavedBookInStorage
  };
}
