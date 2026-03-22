"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";

const quickActions = [
  {
    href: "/books",
    title: "Browse Books",
    description: "Search available listings and open full details for any book."
  },
  {
    href: "/books/new",
    title: "Add a Book",
    description: "Create a listing with pricing, location, and an optional cover image."
  },
  {
    href: "/my-listings",
    title: "My Listings",
    description: "Review the books you have shared and keep an eye on availability."
  },
  {
    href: "/my-requests",
    title: "My Requests",
    description: "Track the requests you have sent and see where each one stands."
  },
  {
    href: "/incoming-requests",
    title: "Incoming Requests",
    description: "Approve or reject requests for books you own."
  },
  {
    href: "/active-rentals",
    title: "Active Rentals",
    description: "Follow current rentals as a renter or confirm returns as an owner."
  }
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
            P2P Book Renting System
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            A simple place to browse books, manage listings, and track every rental flow.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            This frontend now covers the full demo journey: browse, request, approve, rent,
            return, and manage your profile without leaving the app.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/books"
              className="rounded-full bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
            >
              Browse Books
            </Link>
            <Link
              href="/books/new"
              className="rounded-full bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
            >
              Add a Book
            </Link>
            <Link
              href={isAuthenticated ? "/my-listings" : "/login"}
              className="rounded-full bg-white px-5 py-3 font-medium text-slate-900 transition hover:bg-slate-100"
            >
              {isAuthenticated ? "Open Dashboard" : "Login to Continue"}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-slate-900 p-8 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <h2 className="text-2xl font-semibold">What's ready in the demo</h2>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-slate-300">
            <FeatureChip
              label="Auth"
              description="Signup, login, protected routes, and profile management."
            />
            <FeatureChip
              label="Browse"
              description="Book discovery with details pages and cover images."
            />
            <FeatureChip
              label="Requests"
              description="Outgoing and incoming request tracking with approval flows."
            />
            <FeatureChip
              label="Rentals"
              description="Active renter and owner rental views with return confirmation."
            />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Quick Actions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Jump into the main renter and owner flows
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Protected pages will guide guests to login, so these links are safe to use in a demo.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <h3 className="text-lg font-semibold text-slate-900">{action.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              <span className="mt-4 inline-flex text-sm font-medium text-teal-700">Open</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureChip({ label, description }) {
  return (
    <div className="rounded-3xl bg-white/8 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
