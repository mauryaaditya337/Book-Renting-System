"use client";

import { useEffect, useState } from "react";

export function BookCover({
  src,
  title,
  alt,
  ratioClassName = "aspect-[4/5]",
  containerClassName = "",
  imageClassName = "",
  labelClassName = ""
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const hasImage = Boolean(src) && !hasError;

  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-slate-100 ${ratioClassName} ${containerClassName}`.trim()}
    >
      {hasImage ? (
        <img
          src={src}
          alt={alt || `${title || "Book"} cover`}
          onError={() => setHasError(true)}
          className={`h-full w-full object-cover ${imageClassName}`.trim()}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_38%),linear-gradient(145deg,rgba(15,118,110,0.12),rgba(15,23,42,0.08))] px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/82 text-lg font-semibold text-teal-700 shadow-sm">
            {(title || "B").trim().charAt(0).toUpperCase() || "B"}
          </div>
          <p className={`mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 ${labelClassName}`.trim()}>
            No cover
          </p>
          <p className="mt-2 max-w-[10rem] text-sm leading-5 text-slate-600">{title || "Book cover unavailable"}</p>
        </div>
      )}
    </div>
  );
}
