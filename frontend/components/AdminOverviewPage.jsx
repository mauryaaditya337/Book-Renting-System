"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

const EMPTY_SUMMARY = {
  totalRentalRequests: 0,
  activeLockedRentals: 0,
  returnPendingCount: 0,
  completedSettlements: 0,
  totalCurrentlyLockedAmount: 0,
  totalCurrentlyLockedRent: 0,
  totalCurrentlyLockedDeposit: 0
};

export function AdminOverviewPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const requestOptions = useMemo(
    () => ({
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    [token]
  );

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest("/admin/financial/summary", requestOptions);

        if (isActive) {
          setSummary(data.summary || EMPTY_SUMMARY);
        }
      } catch (error) {
        if (isActive) {
          setSummary(EMPTY_SUMMARY);
          setErrorMessage(error.message || "Unable to load admin summary.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isActive = false;
    };
  }, [requestOptions, token]);

  const cards = [
    {
      title: "Users",
      description: "Open the user management area to review admin actions, account controls, and future moderation tools.",
      href: "/admin/users",
      cta: "Open Users",
      value: "Management section"
    },
    {
      title: "Books",
      description: "Inspect listings, moderation workflows, and book-level quality controls from one future workspace.",
      href: "/admin/books",
      cta: "Open Books",
      value: "Catalog section"
    },
    {
      title: "Rentals",
      description: "Track request flow, rental lifecycle activity, and operational follow-up for active exchanges.",
      href: "/admin/rentals",
      cta: "Open Rentals",
      value: isLoading ? "Loading..." : String(summary.totalRentalRequests)
    },
    {
      title: "Financial",
      description: "Review settlement state, locked escrow, and request-level financial details already available today.",
      href: "/admin/financial",
      cta: "Open Financial",
      value: isLoading ? "Loading..." : formatPrice(summary.totalCurrentlyLockedAmount)
    },
    {
      title: "Wallet Requests",
      description: "Centralize wallet request review and admin approval flows in a dedicated section.",
      href: "/admin/wallet-requests",
      cta: "Open Wallet Requests",
      value: "Review queue"
    },
    {
      title: "Audit / System Health",
      description: "Use this area to surface consistency checks, risky states, and the next layer of platform oversight.",
      href: "/admin/financial",
      cta: "Review Financial Audit",
      value: isLoading ? "Loading..." : `${summary.completedSettlements} settled`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Overview</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
          Admin landing page
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Start here to move into each admin section quickly. Existing financial summary data is
          surfaced below, while the other areas are set up as clean placeholders for the next
          admin tools.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
          <h3 className="text-xl font-semibold">Admin summary unavailable</h3>
          <p className="mt-2 text-sm leading-6">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.href}
            className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
          >
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
              Section
            </p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
            <div className="mt-5 rounded-[1.35rem] bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Snapshot</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{card.value}</p>
            </div>
            <Link href={card.href} className="ui-btn-secondary mt-5 inline-flex">
              {card.cta}
            </Link>
          </article>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SnapshotCard
          label="Locked Rentals"
          value={isLoading ? "Loading..." : String(summary.activeLockedRentals)}
          detail="Financial summary already tracks how many rentals currently hold locked funds."
        />
        <SnapshotCard
          label="Return Pending"
          value={isLoading ? "Loading..." : String(summary.returnPendingCount)}
          detail="Use this as a quick signal for rentals waiting on the owner-side completion step."
        />
        <SnapshotCard
          label="Locked Deposit"
          value={isLoading ? "Loading..." : formatPrice(summary.totalCurrentlyLockedDeposit)}
          detail="Shows the deposit portion of escrow currently tied up in active rental flows."
        />
      </div>
    </div>
  );
}

function SnapshotCard({ label, value, detail }) {
  return (
    <div className="ui-trust-card">
      <p className="ui-trust-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900 break-words">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
