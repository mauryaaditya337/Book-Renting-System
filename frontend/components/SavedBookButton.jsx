"use client";

import { useSavedBooks } from "@/lib/savedBooks";

export function SavedBookButton({
  book,
  className = "",
  labelClassName = "",
  showLabel = false,
  size = "default"
}) {
  const { isBookSaved, toggleBook, hasHydrated } = useSavedBooks();
  const isSaved = isBookSaved(book?.id || book?._id);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleBook(book);
  };

  const sizeClassName =
    size === "compact" ? "h-11 min-w-11 px-3" : "h-12 min-w-12 px-3.5";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from saved books" : "Save this book"}
      title={isSaved ? "Saved on this device" : "Save for later on this device"}
      className={`ui-save-button ${sizeClassName} ${isSaved ? "ui-save-button-active" : ""} ${className}`}
    >
      <BookmarkIcon className="h-4 w-4" filled={isSaved} />
      {showLabel ? (
        <span className={`text-sm font-semibold ${labelClassName}`}>
          {hasHydrated ? (isSaved ? "Saved" : "Save for later") : "Save"}
        </span>
      ) : null}
    </button>
  );
}

function BookmarkIcon({ className = "", filled = false }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M6 3.5h8a1 1 0 0 1 1 1V17l-5-2.8L5 17V4.5a1 1 0 0 1 1-1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
