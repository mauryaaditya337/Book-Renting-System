"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

export function AdminUserDetailPage({ id }) {
  const { token } = useAuth();
  const [user, setUser] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [userError, setUserError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isWalletLoading, setIsWalletLoading] = useState(true);

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

    async function loadUser() {
      if (!token) {
        return;
      }

      setIsUserLoading(true);
      setUserError("");

      try {
        const data = await apiRequest(`/admin/users/${id}`, requestOptions);

        if (isActive) {
          setUser(data.user || null);
        }
      } catch (error) {
        if (isActive) {
          setUser(null);
          setUserError(error.message || "Unable to load user detail.");
        }
      } finally {
        if (isActive) {
          setIsUserLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isActive = false;
    };
  }, [id, requestOptions, token]);

  useEffect(() => {
    let isActive = true;

    async function loadWalletData() {
      if (!token) {
        return;
      }

      setIsWalletLoading(true);
      setWalletError("");

      try {
        const data = await apiRequest(`/admin/financial/users/${id}/wallet`, requestOptions);

        if (isActive) {
          setWalletData(data || null);
        }
      } catch (error) {
        if (isActive) {
          setWalletData(null);
          setWalletError(error.message || "Unable to load wallet detail.");
        }
      } finally {
        if (isActive) {
          setIsWalletLoading(false);
        }
      }
    }

    loadWalletData();

    return () => {
      isActive = false;
    };
  }, [id, requestOptions, token]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              User Detail
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              {isUserLoading ? "Loading user..." : user?.fullName || user?.name || "User detail"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Review account information, admin access, wallet summary, recent transactions, wallet
              requests, and current locked rentals in one read-only page.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/users" className="ui-btn-secondary">
              Back to Users
            </Link>
            <Link href="/admin" className="ui-btn-secondary">
              Open Overview
            </Link>
          </div>
        </div>
      </div>

      {userError ? (
        <ErrorPanel title="Unable to load user detail" message={userError} />
      ) : isUserLoading ? (
        <SectionLoadingState />
      ) : !user ? (
        <EmptyPanel
          title="User not found"
          description="The requested user could not be found or is no longer available."
        />
      ) : (
        <UserSummaryCard user={user} />
      )}

      {walletError ? (
        <ErrorPanel title="Unable to load wallet detail" message={walletError} />
      ) : isWalletLoading ? (
        <SectionLoadingState />
      ) : !walletData ? (
        <EmptyPanel
          title="No wallet detail available"
          description="Wallet detail could not be loaded for this user."
        />
      ) : (
        <div className="space-y-4">
          <WalletSummaryCard wallet={walletData.wallet} />

          <SubsectionCard
            title="Recent Wallet Transactions"
            emptyMessage="No transactions recorded for this user yet."
            items={walletData.transactions || []}
            renderItem={(transaction) => (
              <CompactListItem
                key={transaction._id}
                title={`${toTitleCase(transaction.type)} - ${formatPrice(transaction.amount)}`}
                meta={`${toTitleCase(transaction.status)} | ${formatDateTime(transaction.createdAt)}`}
                detail={transaction.description || transaction.referenceId || "No description"}
                aside={transaction.metadata?.source ? `Source: ${toTitleCase(transaction.metadata.source)}` : ""}
              />
            )}
          />

          <SubsectionCard
            title="Wallet Requests"
            emptyMessage="No wallet requests recorded for this user yet."
            items={walletData.walletRequests || []}
            renderItem={(request) => (
              <CompactListItem
                key={request._id}
                title={`${formatPrice(request.amount)} - ${toTitleCase(request.status)}`}
                meta={formatDateTime(request.createdAt)}
                detail={request.note || "No note added"}
                aside={request.adminNote || getWalletRequestDecisionLine(request)}
              />
            )}
          />

          <SubsectionCard
            title="Current Locked Rentals"
            emptyMessage="This user has no renter-side locked rentals right now."
            items={walletData.lockedRentals || []}
            renderItem={(rental) => (
              <CompactListItem
                key={rental.requestId}
                title={rental.bookTitle || "Book unavailable"}
                meta={`${toTitleCase(rental.status)} | ${formatPrice(rental.totalLockedAmount)} locked`}
                detail={`Rent: ${formatPrice(rental.lockedRent)} | Deposit: ${formatPrice(rental.lockedDeposit)}`}
                aside={rental.ownerName || "Unknown owner"}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

function UserSummaryCard({ user }) {
  return (
    <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-slate-900">{user.fullName || user.name || "Unknown user"}</h3>
              {user.isAdmin ? (
                <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Admin
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoRow label="Created" value={formatDateTime(user.createdAt)} />
          <InfoRow label="Role" value={user.isAdmin ? "Admin" : "User"} />
          <InfoRow label="College" value={user.collegeName || "Not provided"} />
          <InfoRow label="Phone" value={user.phoneNumber || "Not provided"} />
          <InfoRow label="City" value={user.city || "Not provided"} />
          <InfoRow label="State" value={user.state || "Not provided"} />
          <InfoRow label="Qualification" value={user.qualification || "Not provided"} />
          <InfoRow label="Current degree" value={user.currentDegree || "Not provided"} />
          <InfoRow label="Address" value={user.address || "Not provided"} />
          <InfoRow label="Bio" value={user.bio || "Not provided"} />
        </div>
      </div>
    </article>
  );
}

function WalletSummaryCard({ wallet }) {
  return (
    <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Wallet Summary</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">Balances and wallet state</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoRow label="Available balance" value={formatPrice(wallet?.generalBalance)} />
          <InfoRow label="Locked balance" value={formatPrice(wallet?.lockedBalance)} />
          <InfoRow label="Wallet created" value={formatDateTime(wallet?.createdAt)} />
          <InfoRow label="Wallet updated" value={formatDateTime(wallet?.updatedAt)} />
        </div>
      </div>
    </article>
  );
}

function SubsectionCard({ title, emptyMessage, items, renderItem }) {
  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{emptyMessage}</p>
      ) : (
        <div className="mt-4 grid gap-3">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

function CompactListItem({ title, meta, detail, aside }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-slate-800">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{meta}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 break-words">{detail}</p>
        </div>
        {aside ? <p className="text-xs text-slate-500 lg:max-w-[12rem] lg:text-right">{aside}</p> : null}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800 break-words">{value || "Not available"}</p>
    </div>
  );
}

function ErrorPanel({ title, message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SectionLoadingState() {
  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <div className="h-56 animate-pulse rounded-[1.5rem] bg-slate-100" />
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toTitleCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getWalletRequestDecisionLine(request) {
  if (request.approvedAt) {
    return `Approved ${formatDateTime(request.approvedAt)}`;
  }

  if (request.rejectedAt) {
    return `Rejected ${formatDateTime(request.rejectedAt)}`;
  }

  return "Awaiting admin review";
}
