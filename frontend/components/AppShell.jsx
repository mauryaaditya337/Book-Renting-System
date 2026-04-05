"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { NotificationBell } from "@/components/NotificationBell";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, token, user } = useAuth();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [walletSummary, setWalletSummary] = useState({
    generalBalance: 0,
    isLoading: false,
    errorMessage: ""
  });
  const lastScrollYRef = useRef(0);

  const primaryLinks = [
    { href: "/", label: "Home", shortLabel: "Home", icon: HomeIcon },
    { href: "/books", label: "Browse", shortLabel: "Browse", icon: BrowseIcon },
    { href: "/feedback", label: "Feedback", shortLabel: "Feedback", icon: FeedbackIcon }
  ];

  const authenticatedLinks = [
    { href: "/my-requests", label: "My Requests", shortLabel: "Requests", icon: RequestsIcon },
    { href: "/my-chats", label: "My Chats", shortLabel: "Chats", icon: ChatIcon },
    { href: "/my-listings", label: "My Listings", shortLabel: "Listings", icon: ListingsIcon },
    { href: "/incoming-requests", label: "Incoming", shortLabel: "Incoming", icon: InboxIcon },
    { href: "/active-rentals", label: "Rentals", shortLabel: "Rentals", icon: RentalsIcon },
    { href: "/wallet", label: "Wallet", shortLabel: "Wallet", icon: WalletIcon }
  ];
  const adminLinks = [
    { href: "/admin/financial", label: "Admin Dashboard", shortLabel: "Admin", icon: AdminIcon }
  ];

  const guestMenuLinks = [
    { href: "/login", label: "Login" },
    { href: "/signup", label: "Sign up" }
  ];

  const userMenuLinks = [
    { href: "/profile", label: "View Profile" },
    { href: "/wallet", label: "Wallet" },
    { href: "/my-listings", label: "My Listings" },
    { href: "/my-chats", label: "My Chats" },
    { href: "/my-requests", label: "My Requests" },
    { href: "/my-feedback", label: "My Feedback" }
  ];

  const navLinks = useMemo(
    () =>
      isAuthenticated
        ? [...primaryLinks, ...authenticatedLinks, ...(user?.isAdmin ? adminLinks : [])]
        : primaryLinks,
    [isAuthenticated, user]
  );
  const visibleUserMenuLinks = useMemo(
    () => [...userMenuLinks, ...(user?.isAdmin ? [{ href: "/admin/financial", label: "Admin Dashboard" }] : [])],
    [user]
  );

  const mobileDockLinks = useMemo(
    () =>
      isAuthenticated
        ? [
            { href: "/", label: "Home", icon: HomeIcon },
            { href: "/books", label: "Browse", icon: BrowseIcon },
            { href: "/my-chats", label: "Chats", icon: ChatIcon },
            { href: "/my-requests", label: "Requests", icon: RequestsIcon },
            { href: "/active-rentals", label: "Rentals", icon: RentalsIcon }
          ]
        : [
            { href: "/", label: "Home", icon: HomeIcon },
            { href: "/books", label: "Browse", icon: BrowseIcon },
            { href: "/login", label: "Login", icon: UserIcon },
            { href: "/signup", label: "Sign up", icon: PlusIcon }
          ],
    [isAuthenticated]
  );
  const shouldHideMobileDock =
    /^\/books\/[^/]+$/.test(pathname || "");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;

      setIsHeaderCondensed(currentY > 18);

      if (currentY <= 12) {
        setIsHeaderVisible(true);
      } else if (delta > 8 && !isMobileMenuOpen) {
        setIsHeaderVisible(false);
      } else if (delta < -4) {
        setIsHeaderVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isActive = true;

    async function loadWalletSummary() {
      if (!isAuthenticated || !token) {
        if (isActive) {
          setWalletSummary({
            generalBalance: 0,
            isLoading: false,
            errorMessage: ""
          });
        }
        return;
      }

      setWalletSummary((current) => ({
        ...current,
        isLoading: true,
        errorMessage: ""
      }));

      try {
        const data = await apiRequest("/wallet/me", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!isActive) {
          return;
        }

        setWalletSummary({
          generalBalance: data.wallet?.generalBalance ?? 0,
          isLoading: false,
          errorMessage: ""
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWalletSummary({
          generalBalance: 0,
          isLoading: false,
          errorMessage: error.message || "Unable to load wallet"
        });
      }
    }

    loadWalletSummary();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, token]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="mobile-shell min-h-screen px-3 pb-24 pt-3 sm:px-5 sm:pb-10 sm:pt-4 lg:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <div
          className={`sticky top-2 z-40 transition-all duration-300 ease-out sm:top-3 ${
            isHeaderVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-[calc(100%+1rem)] opacity-95"
          }`}
        >
          <header
            className={`ui-topbar relative overflow-visible px-3 sm:px-4 ${
              isHeaderCondensed ? "py-2.5 sm:py-3" : "py-3 sm:py-4"
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link
                href="/"
                className="min-w-0 shrink rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 text-sm font-semibold">
                    B
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight sm:text-base">BookRent</p>
                    <p className="hidden text-[11px] text-slate-300 sm:block">Rent, lend, repeat</p>
                  </div>
                </div>
              </Link>

              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-medium text-slate-900">
                  Discover books, manage listings, and track every rental in one place.
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  aria-expanded={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="ui-header-icon sm:hidden"
                >
                  <MenuIcon isOpen={isMobileMenuOpen} />
                </button>
                <NotificationBell
                  buttonClassName="ui-header-icon"
                  panelClassName="sm:top-[calc(100%+0.9rem)]"
                />
                {isAuthenticated ? (
                  <WalletHeaderEntry
                    balance={walletSummary.generalBalance}
                    isLoading={walletSummary.isLoading}
                    hasError={Boolean(walletSummary.errorMessage)}
                    pathname={pathname}
                  />
                ) : null}
                <AccountMenu
                  isAuthenticated={isAuthenticated}
                  pathname={pathname}
                  user={user}
                  guestMenuLinks={guestMenuLinks}
                  userMenuLinks={visibleUserMenuLinks}
                  onLogout={handleLogout}
                />
              </div>
            </div>

            <div className="mt-3 hidden border-t border-slate-200/80 pt-3 sm:block">
              <nav className="ui-nav-scroll flex gap-2 overflow-x-auto pb-1">
                {navLinks.map((link) => (
                  <HeaderNavLink key={link.href} href={link.href} pathname={pathname}>
                    {link.shortLabel || link.label}
                  </HeaderNavLink>
                ))}
              </nav>
            </div>

            {isMobileMenuOpen ? (
              <div className="mt-3 border-t border-slate-200/80 pt-3 sm:hidden">
                <div className="mobile-menu-grid">
                  {navLinks.map((link) => {
                    const Icon = link.icon || HomeIcon;
                    const isActive = isActivePath(link.href, pathname);

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`mobile-menu-link ${
                          isActive
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </header>
        </div>

        <main className="flex-1 pt-4 sm:pt-6">{children}</main>
      </div>

      <nav className={`mobile-bottom-dock sm:hidden ${shouldHideMobileDock ? "hidden" : ""}`}>
        {mobileDockLinks.map((link) => {
          const Icon = link.icon;
          const isActive = isActivePath(link.href, pathname);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-bottom-link ${isActive ? "text-slate-900" : "text-slate-500"}`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                  isActive ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function WalletHeaderEntry({ balance, isLoading, hasError, pathname }) {
  const isActive = isActivePath("/wallet", pathname);
  const balanceLabel = isLoading ? "Loading..." : hasError ? "Unavailable" : formatPrice(balance);

  return (
    <Link
      href="/wallet"
      aria-label="Open wallet available balance"
      title={hasError ? "Wallet unavailable right now" : "Open wallet available balance"}
      className={`hidden items-center gap-3 rounded-2xl border px-3 py-2.5 transition md:flex ${
        isActive
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-white/70 bg-white/85 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:bg-white"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          isActive ? "bg-white/12 text-white" : "bg-slate-100 text-slate-700"
        }`}
      >
        <WalletIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[11px] uppercase tracking-[0.22em] ${isActive ? "text-slate-200" : "text-slate-500"}`}>
          Available
        </span>
        <span className="block text-sm font-semibold">
          {balanceLabel}
        </span>
      </span>
    </Link>
  );
}

function AccountMenu({
  isAuthenticated,
  pathname,
  user,
  guestMenuLinks,
  userMenuLinks,
  onLogout
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const displayName = user?.fullName || user?.name || "Guest";
  const initial = displayName.trim().charAt(0).toUpperCase() || "G";

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

  return (
    <div className="relative z-50" ref={panelRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="ui-header-user"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
          {initial}
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {displayName}
          </span>
          <span className="block text-xs text-slate-500">
            {isAuthenticated ? "Account" : "Welcome"}
          </span>
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
        <div className="ui-floating-panel absolute right-0 z-50 mt-3 w-[min(92vw,19rem)] overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/96 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="rounded-[1.35rem] bg-slate-50/90 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="mt-1 text-xs text-slate-500">
              {isAuthenticated ? "Manage your profile and activity" : "Sign in to manage rentals and listings"}
            </p>
          </div>

          <div className="mt-3 space-y-1.5">
            {(isAuthenticated ? userMenuLinks : guestMenuLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActivePath(link.href, pathname)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{link.label}</span>
                <span className="text-xs opacity-70">Open</span>
              </Link>
            ))}
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="mt-3 w-full rounded-2xl bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Logout
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HeaderNavLink({ href, pathname, children }) {
  const isActive = isActivePath(href, pathname);

  return (
    <Link
      href={href}
      className={`ui-header-nav-pill whitespace-nowrap ${
        isActive
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-slate-100/90 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}

function isActivePath(href, pathname) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-4 w-4 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
    >
      <path
        d="M5.5 7.5 10 12l4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MenuIcon({ isOpen }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
      {isOpen ? (
        <path
          d="m5 5 10 10M15 5 5 15"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : (
        <path
          d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
}

function HomeIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M3.5 8.5 10 3l6.5 5.5v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7.5 17v-4.5h5V17" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function BrowseIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M4 4.5h12v11H4z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7 4.5v11" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function FeedbackIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M4 5.5h12v8H8l-4 3v-11Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function RequestsIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M5 4.5h10v11H5z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7.5 8h5M7.5 11h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function ListingsIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M4.5 5.5h11M4.5 10h11M4.5 14.5h11" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function InboxIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M4 6h12l-1.2 8.5H5.2L4 6Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7.5 9.5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function RentalsIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M5 5.5h10v9H5z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7.5 14.5v2M12.5 14.5v2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function ChatIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M4 5.5h12v7.5H9l-4 3v-10.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M7 8.75h6M7 11h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function WalletIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M4.5 6.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 13V8A1.5 1.5 0 0 1 4.5 6.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M13 10.5h3M5.5 6.5V5.75A1.75 1.75 0 0 1 7.25 4h6.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="13.5" cy="10.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function AdminIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        d="M10 3.5 15.5 6v4.25c0 3.1-2.16 5.96-5.5 6.95-3.34-.99-5.5-3.85-5.5-6.95V6L10 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7.75 10.25h4.5M10 8v4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function UserIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 10.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M4.5 16c1.2-2 3.05-3 5.5-3s4.3 1 5.5 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function PlusIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}
