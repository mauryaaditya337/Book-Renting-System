"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const notificationRouteByType = {
  rental_request_created: "/incoming-requests",
  rental_request_approved: "/my-requests",
  rental_request_rejected: "/my-requests",
  rental_return_initiated: "/owner-rentals",
  rental_return_confirmed: "/active-rentals"
};

const POLLING_INTERVAL_MS = 10000;

function formatNotificationTime(createdAt) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffInMinutes = Math.round((date.getTime() - now.getTime()) / (1000 * 60));
  const absoluteMinutes = Math.abs(diffInMinutes);
  const dayDifference =
    Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000) -
    Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);

  if (absoluteMinutes < 1) {
    return "Just now";
  }

  if (absoluteMinutes < 60) {
    return `${absoluteMinutes} min${absoluteMinutes === 1 ? "" : "s"} ago`;
  }

  const absoluteHours = Math.round(absoluteMinutes / 60);

  if (absoluteHours < 24) {
    return `${absoluteHours} hour${absoluteHours === 1 ? "" : "s"} ago`;
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function NotificationBell({ buttonClassName = "", panelClassName = "" }) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const panelRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isMountedRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const actionableCount = useMemo(
    () =>
      notifications.filter((notification) => Boolean(notificationRouteByType[notification.type])).length,
    [notifications]
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (typeof document !== "undefined") {
      setIsPageVisible(document.visibilityState === "visible");
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    const handleWindowFocus = () => {
      setIsPageVisible(true);
    };

    const handleWindowBlur = () => {
      setIsPageVisible(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const loadNotifications = async ({ withLoading = false } = {}) => {
    if (!token) {
      return;
    }

    if (withLoading) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const data = await apiRequest("/notifications", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (!isMountedRef.current) {
        return;
      }

      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setErrorMessage(error.message || "Unable to load notifications right now.");
    } finally {
      if (withLoading && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setNotifications([]);
      setIsOpen(false);
      setErrorMessage("");

      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      return;
    }

    loadNotifications({ withLoading: true });
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || !isPageVisible) {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      return undefined;
    }

    loadNotifications({ withLoading: false });
    pollingIntervalRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications({ withLoading: false });
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, token, isPageVisible]);

  useEffect(() => {
    if (isOpen && isAuthenticated && token) {
      loadNotifications({ withLoading: false });
    }
  }, [isAuthenticated, isOpen, token]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!isAuthenticated || !token) {
    return null;
  }

  const handleNotificationClick = async (notification) => {
    if (!notification?.id || !token) {
      return;
    }

    if (notification.isRead) {
      return;
    }

    try {
      await apiRequest(`/notifications/${notification.id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotifications((currentNotifications) =>
        currentNotifications.map((currentNotification) =>
          currentNotification.id === notification.id
            ? { ...currentNotification, isRead: true }
            : currentNotification
        )
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to update the notification.");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || !token) {
      return;
    }

    setIsMarkingAll(true);
    setErrorMessage("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to mark all notifications as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="relative z-50" ref={panelRef}>
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 ${unreadCount > 0 ? "ring-4 ring-teal-100" : ""} ${buttonClassName}`.trim()}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full border-2 border-white bg-teal-700 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={`ui-floating-panel absolute right-0 z-50 mt-3 w-[min(92vw,27rem)] overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur ${panelClassName}`.trim()}
        >
          <div className="border-b border-slate-200/80 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <p className="text-xs text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0 || isMarkingAll}
                className="ui-pill-nav bg-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingAll ? "Updating..." : "Mark all as read"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <PanelStat label="Unread" value={String(unreadCount)} tone="teal" />
              <PanelStat label="Actionable" value={String(actionableCount)} tone="slate" />
            </div>
          </div>

          <div className="notification-panel-scroll max-h-[30rem] overflow-y-auto px-3 py-3">
            {isLoading ? (
              <PanelState
                title="Loading notifications"
                description="Checking for the latest request and rental updates."
              />
            ) : null}

            {!isLoading && errorMessage ? (
              <div className="ui-feedback-error rounded-[1.4rem]">
                {errorMessage}
              </div>
            ) : null}

            {!isLoading && !errorMessage && notifications.length === 0 ? (
              <PanelState
                title="No notifications yet"
                description="Request updates, rental changes, and other account activity will show up here when there is something worth your attention."
              />
            ) : null}

            {!isLoading && !errorMessage && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const href = notificationRouteByType[notification.type] || "";
                  const meta = getNotificationMeta(notification, href);
                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`notification-type-chip ${meta.toneClassName}`}>
                              {meta.typeLabel}
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                              {notification.isRead ? "Read" : "Unread"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {meta.detail}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {!notification.isRead ? (
                            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-600 shadow-[0_0_0_4px_rgba(20,184,166,0.12)]" />
                          ) : null}
                          {meta.isActionable ? (
                            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                              Open
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-3">
                        <p className="text-xs text-slate-500">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {meta.ctaLabel}
                        </p>
                      </div>
                    </>
                  );

                  const itemClassName = `block w-full rounded-[1.45rem] border px-4 py-3 text-left transition duration-200 ${
                    notification.isRead
                      ? "border-slate-200 bg-slate-50/78 hover:bg-slate-100"
                      : `border-teal-100 bg-teal-50/72 hover:bg-teal-100/75 ${meta.rowAccentClassName}`
                  }`;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={async () => {
                        await handleNotificationClick(notification);

                        if (href) {
                          setIsOpen(false);
                          router.push(href);
                        }
                      }}
                      className={itemClassName}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getNotificationMeta(notification, href) {
  const type = notification?.type || "";

  if (type.startsWith("rental_request_")) {
    return {
      typeLabel: "Request update",
      detail: href
        ? "Review the latest request status and continue from the linked request view."
        : "This notification is tied to a rental request update.",
      ctaLabel: href ? "Open request flow" : "Info only",
      toneClassName: "notification-chip-request",
      rowAccentClassName: "notification-row-request",
      isActionable: Boolean(href)
    };
  }

  if (type.startsWith("rental_return_")) {
    return {
      typeLabel: "Rental update",
      detail: href
        ? "This affects an active rental or return step. Open it to check the current lifecycle state."
        : "This notification is tied to a rental lifecycle update.",
      ctaLabel: href ? "Open rental flow" : "Info only",
      toneClassName: "notification-chip-rental",
      rowAccentClassName: "notification-row-rental",
      isActionable: Boolean(href)
    };
  }

  return {
    typeLabel: "Account update",
    detail: "General activity update for your account.",
    ctaLabel: href ? "Open update" : "Info only",
    toneClassName: "notification-chip-general",
    rowAccentClassName: "notification-row-general",
    isActionable: Boolean(href)
  };
}

function PanelStat({ label, value, tone }) {
  const toneClassName =
    tone === "teal"
      ? "border-teal-200 bg-teal-50/90 text-teal-900"
      : "border-slate-200 bg-slate-50/90 text-slate-900";

  return (
    <div className={`rounded-[1.2rem] border px-3.5 py-3 shadow-sm ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/70">{label}</p>
      <p className="mt-1 text-base font-semibold text-current">{value}</p>
    </div>
  );
}

function PanelState({ title, description }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/85 px-5 py-7 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <BellIcon />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M12 3.75a4.5 4.5 0 0 0-4.5 4.5v1.1c0 .89-.3 1.76-.85 2.46l-1.23 1.58A1.5 1.5 0 0 0 6.6 15.75h10.8a1.5 1.5 0 0 0 1.18-2.36l-1.23-1.58a4 4 0 0 1-.85-2.46v-1.1a4.5 4.5 0 0 0-4.5-4.5Zm0 17.25a2.63 2.63 0 0 1-2.34-1.44.75.75 0 0 1 .67-1.06h3.34a.75.75 0 0 1 .67 1.06A2.63 2.63 0 0 1 12 21Z"
        fill="currentColor"
      />
    </svg>
  );
}
