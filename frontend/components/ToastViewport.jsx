"use client";

import { useEffect, useMemo, useRef } from "react";

export function ToastViewport({ toasts = [] }) {
  const timeoutRefs = useRef(new Map());

  const visibleToasts = useMemo(
    () =>
      toasts.filter((toast) => toast && toast.message).map((toast, index) => ({
        duration: 4200,
        tone: "info",
        ...toast,
        id: toast.id || `${toast.tone || "info"}-${toast.message}-${index}`
      })),
    [toasts]
  );

  useEffect(() => {
    const activeIds = new Set(visibleToasts.map((toast) => toast.id));

    visibleToasts.forEach((toast) => {
      if (!toast.onDismiss || timeoutRefs.current.has(toast.id)) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        timeoutRefs.current.delete(toast.id);
        toast.onDismiss();
      }, toast.duration);

      timeoutRefs.current.set(toast.id, timeoutId);
    });

    timeoutRefs.current.forEach((timeoutId, toastId) => {
      if (!activeIds.has(toastId)) {
        window.clearTimeout(timeoutId);
        timeoutRefs.current.delete(toastId);
      }
    });

    return () => {
      timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, [visibleToasts]);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="ui-toast-viewport" aria-live="polite" aria-atomic="true">
      {visibleToasts.map((toast) => (
        <div key={toast.id} className={`ui-toast ui-toast-${toast.tone}`}>
          <div className="flex items-start gap-3">
            <span className="ui-toast-icon" aria-hidden="true">
              {getToastIcon(toast.tone)}
            </span>
            <div className="min-w-0 flex-1">
              {toast.title ? <p className="ui-toast-title">{toast.title}</p> : null}
              <p className="ui-toast-message">{toast.message}</p>
            </div>
            {toast.onDismiss ? (
              <button
                type="button"
                onClick={toast.onDismiss}
                className="ui-toast-close"
                aria-label="Dismiss notification"
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function getToastIcon(tone) {
  if (tone === "success") {
    return <SuccessIcon />;
  }

  if (tone === "error") {
    return <ErrorIcon />;
  }

  return <InfoIcon />;
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 10.5 8.2 13.5 15 6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="m6 6 8 8m0-8-8 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 9v4m0-7h.01M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="m6 6 8 8m0-8-8 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
