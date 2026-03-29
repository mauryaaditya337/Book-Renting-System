"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";

const primaryActions = [
  {
    href: "/books",
    title: "Browse Books",
    description: "Explore rental and sale listings from the community."
  },
  {
    href: "/books?view=saved",
    title: "Saved Books",
    description: "Revisit books you saved on this device for later comparison."
  },
  {
    href: "/books/new",
    title: "Add a Book",
    description: "Create a listing with pricing, location, and images."
  },
  {
    href: "/my-requests",
    title: "My Requests",
    description: "Track outgoing requests and rental progress."
  },
  {
    href: "/my-listings",
    title: "My Listings",
    description: "Manage availability and keep your catalog up to date."
  }
];

const featureCards = [
  {
    title: "Easy Renting",
    description: "Send requests, confirm rentals, and follow each step without leaving the app."
  },
  {
    title: "Nearby Books",
    description: "Find books around your campus or city with clear pickup and meetup details."
  },
  {
    title: "Secure Requests",
    description: "Owners review each request before approval, so handoffs are clearer and more controlled."
  },
  {
    title: "Smooth Tracking",
    description: "Borrowers and owners both get dedicated views for requests, rentals, and returns."
  }
];

const trustPoints = [
  { value: "Browse", label: "See pricing, condition, and pickup facts early" },
  { value: "Request", label: "Owners review requests before approval" },
  { value: "Track", label: "Follow approvals, rentals, and returns clearly" }
];

const authenticatedHighlights = [
  {
    title: "Borrowing dashboard",
    description: "Check your requests, active rentals, and return status from one place.",
    href: "/my-requests",
    cta: "Open My Requests"
  },
  {
    title: "Lending dashboard",
    description: "Review new incoming requests and keep your listings organized.",
    href: "/incoming-requests",
    cta: "Review Incoming Requests"
  }
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const userName = user?.fullName || user?.name || "Reader";

  return (
    <section className="space-y-5 sm:space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="ui-surface relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_60%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              P2P Book Renting System
            </div>

            <h1 className="mt-5 max-w-3xl text-[2.35rem] font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
              Rent, lend, and manage books with a cleaner campus-friendly workflow.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Browse nearby books, create listings, and track requests from first click to final
              return. The experience stays simple for guests and becomes a practical dashboard once
              you sign in.
            </p>

            <div className="ui-trust-band mt-6 max-w-2xl">
              <p className="ui-trust-label">Built for dependable exchanges</p>
              <p className="ui-trust-copy">
                Listings surface condition, availability, pricing, meetup context, and request
                status so both sides can make clearer decisions before any handoff.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/books" className="ui-btn-primary w-full sm:w-auto">
                Browse Books
              </Link>
              <Link
                href={isAuthenticated ? "/books/new" : "/signup"}
                className="ui-btn-secondary w-full sm:w-auto"
              >
                {isAuthenticated ? "Add a Book" : "Create Account"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {trustPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-[1.4rem] border border-slate-200/80 bg-white/78 px-4 py-4 shadow-sm"
                >
                  <p className="text-lg font-semibold text-slate-900">{point.value}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{point.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="ui-card bg-slate-900 p-6 text-slate-100 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-300">
            {isAuthenticated ? "Welcome Back" : "Get Started"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
            {isAuthenticated
              ? `Good to see you, ${userName}.`
              : "A smoother way to share and borrow books."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            {isAuthenticated
              ? "Jump back into your renter and owner flows with clear actions and less clutter."
              : "Guests can explore the catalog right away, and signing in unlocks requests, listings, and rental tracking."}
          </p>

          <div className="mt-6 space-y-3">
            {(isAuthenticated ? authenticatedHighlights : guestHighlights).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 transition hover:bg-white/10"
              >
                <p className="text-base font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                <span className="mt-3 inline-flex text-sm font-medium text-teal-300">
                  {item.cta}
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <section className="ui-surface p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Quick Actions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Jump into the parts of the product you actually use
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            The same routes and flows are still here, just surfaced in a cleaner and more compact
            way.
          </p>
        </div>

        <div className="ui-nav-scroll mt-5 flex gap-3 overflow-x-auto pb-1">
          {(isAuthenticated ? primaryActions : primaryActions.slice(0, 2)).map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="min-w-[15rem] rounded-[1.45rem] border border-slate-200/80 bg-slate-50/90 px-4 py-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:min-w-[16rem]"
            >
              <p className="text-base font-semibold text-slate-900">{action.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="ui-surface p-5 sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            Why It Works
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Built for simple book-sharing flows
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {featureCards.map((feature) => (
              <div key={feature.title} className="ui-subtle-card p-5">
                <p className="text-base font-semibold text-slate-900">{feature.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-surface p-5 sm:p-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            Product Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            A cleaner front door for the full renting demo
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SnapshotCard
              label="Browse"
              title="Explore listings quickly"
              description="Browse books, compare pricing, and open details without fighting clutter."
            />
            <SnapshotCard
              label="Requests"
              title="Track every request clearly"
              description="Outgoing, incoming, and return states are all easier to understand at a glance."
            />
            <SnapshotCard
              label="Listings"
              title="Share books with confidence"
              description="Create and update listings with structured forms, pricing, and meetup details."
            />
            <SnapshotCard
              label="Feedback"
              title="Collect real-user input"
              description="Built-in feedback routes help you capture bugs, ideas, and product notes during validation."
            />
          </div>
        </div>
      </section>
    </section>
  );
}

const guestHighlights = [
  {
    title: "Browse as a guest",
    description: "Explore the catalog and understand the product before you create an account.",
    href: "/books",
    cta: "Open Browse"
  },
  {
    title: "Start listing later",
    description: "Create an account when you’re ready to add books, request rentals, or manage returns.",
    href: "/signup",
    cta: "Create Account"
  }
];

function SnapshotCard({ label, title, description }) {
  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/82 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
