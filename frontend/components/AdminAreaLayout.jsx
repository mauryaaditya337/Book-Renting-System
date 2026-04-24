"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview", description: "Landing page and quick actions" },
  { href: "/admin/users", label: "Users", description: "User management and account review" },
  { href: "/admin/books", label: "Books", description: "Catalog moderation and listing checks" },
  { href: "/admin/rentals", label: "Rentals", description: "Request and rental lifecycle oversight" },
  { href: "/admin/feedback", label: "Feedback", description: "Platform feedback review and triage" },
  { href: "/admin/financial", label: "Financial", description: "Settlement and escrow visibility" },
  { href: "/admin/wallet-requests", label: "Wallet Requests", description: "Top-up and review workflow" }
];

export function AdminAreaLayout({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <ProtectedPage>
      {!user?.isAdmin ? (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-700">
              Admin Only
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              You do not have access to this admin area
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
              This dashboard module is reserved for admin accounts. If you expected access, sign in
              with an account that has admin permissions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="ui-btn-primary">
                Back to Home
              </Link>
              <Link href="/profile" className="ui-btn-secondary">
                Open Profile
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                  Admin Workspace
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                  Manage platform operations from one place
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Review platform activity, move between admin sections quickly, and keep financial,
                  rental, and moderation workflows organized inside one shared workspace.
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">Admin navigation</p>
                <p className="mt-1">Use the section links below to move through the admin module.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.1)] sm:p-4">
            <nav className="ui-nav-scroll flex gap-2 overflow-x-auto pb-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`ui-pill-nav whitespace-nowrap ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    title={item.description}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>{children}</div>
        </section>
      )}
    </ProtectedPage>
  );
}
