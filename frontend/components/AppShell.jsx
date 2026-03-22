"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuth();

  const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/books", label: "Browse Books" }
  ];
  const renterLinks = [
    { href: "/my-requests", label: "My Requests" },
    { href: "/active-rentals", label: "Active Rentals" }
  ];
  const ownerLinks = [
    { href: "/books/new", label: "Add a Book" },
    { href: "/my-listings", label: "My Listings" },
    { href: "/incoming-requests", label: "Incoming Requests" },
    { href: "/owner-rentals", label: "Owner Rentals" }
  ];
  const accountLinks = [{ href: "/profile", label: "Profile" }];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="mb-8 rounded-[2rem] border border-white/60 bg-white/78 px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur md:px-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-900">
                  BookRent
                </Link>
                <p className="mt-1 text-sm text-slate-600">
                  Discover books, manage listings, and track every rental in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {isAuthenticated ? (
                  <>
                    <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2 text-teal-800">
                      Signed in as <span className="font-semibold">{user?.name || "Reader"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-full bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink href="/login" pathname={pathname}>
                      Login
                    </NavLink>
                    <Link
                      href="/signup"
                      className="rounded-full bg-teal-700 px-4 py-2 font-medium text-white transition hover:bg-teal-800"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr]">
              <NavGroup title="Explore" links={publicLinks} pathname={pathname} />

              {isAuthenticated ? (
                <>
                  <NavGroup title="Borrowing" links={renterLinks} pathname={pathname} />
                  <NavGroup
                    title="Lending"
                    links={[...ownerLinks, ...accountLinks]}
                    pathname={pathname}
                  />
                </>
              ) : (
                <>
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">Borrowing</p>
                    <p className="mt-2 leading-6">
                      Sign in to manage your requests and track active rentals.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">Lending</p>
                    <p className="mt-2 leading-6">
                      Create an account to list books, review requests, and confirm returns.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({ title, links, pathname }) {
  return (
    <section className="rounded-3xl border border-white/60 bg-slate-50/75 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <NavLink key={link.href} href={link.href} pathname={pathname}>
            {link.label}
          </NavLink>
        ))}
      </div>
    </section>
  );
}

function NavLink({ href, pathname, children }) {
  const isActive = href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 transition ${
        isActive
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}
