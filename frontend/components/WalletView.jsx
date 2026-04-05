"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

const SECTION_CONFIG = [
  { id: "transactions", label: "Transactions" },
  { id: "requests", label: "Wallet Requests" },
  { id: "lockedRentals", label: "Locked Rentals" }
];

const INITIAL_DATA_STATE = {
  wallet: null,
  transactions: [],
  walletRequests: [],
  lockedRentals: [],
  ownerLockedRentals: []
};

const INITIAL_ERROR_STATE = {
  wallet: "",
  transactions: "",
  walletRequests: "",
  lockedRentals: "",
  ownerLockedRentals: ""
};

export function WalletView() {
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState("transactions");
  const [walletData, setWalletData] = useState(INITIAL_DATA_STATE);
  const [errors, setErrors] = useState(INITIAL_ERROR_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpError, setTopUpError] = useState("");
  const [topUpSuccess, setTopUpSuccess] = useState("");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  const requestOptions = {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  useEffect(() => {
    let isActive = true;

    async function loadWalletData() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrors(INITIAL_ERROR_STATE);

      const results = await Promise.allSettled([
        apiRequest("/wallet/me", requestOptions),
        apiRequest("/wallet/transactions/me", requestOptions),
        apiRequest("/wallet/requests/me", requestOptions),
        apiRequest("/wallet/locked-rentals/me", requestOptions),
        apiRequest("/wallet/locked-rentals/owner", requestOptions)
      ]);

      if (!isActive) {
        return;
      }

      const [walletResult, transactionsResult, requestsResult, lockedRentalsResult, ownerLockedRentalsResult] =
        results;

      setWalletData({
        wallet: walletResult.status === "fulfilled" ? walletResult.value.wallet || null : null,
        transactions:
          transactionsResult.status === "fulfilled" ? transactionsResult.value.transactions || [] : [],
        walletRequests:
          requestsResult.status === "fulfilled" ? requestsResult.value.walletRequests || [] : [],
        lockedRentals:
          lockedRentalsResult.status === "fulfilled"
            ? lockedRentalsResult.value.lockedRentals || []
            : [],
        ownerLockedRentals:
          ownerLockedRentalsResult.status === "fulfilled"
            ? ownerLockedRentalsResult.value.lockedRentals || []
            : []
      });

      setErrors({
        wallet: walletResult.status === "rejected" ? walletResult.reason?.message || "Unable to load wallet summary." : "",
        transactions:
          transactionsResult.status === "rejected"
            ? transactionsResult.reason?.message || "Unable to load transactions."
            : "",
        walletRequests:
          requestsResult.status === "rejected"
            ? requestsResult.reason?.message || "Unable to load wallet requests."
            : "",
        lockedRentals:
          lockedRentalsResult.status === "rejected"
            ? lockedRentalsResult.reason?.message || "Unable to load locked rentals."
            : "",
        ownerLockedRentals:
          ownerLockedRentalsResult.status === "rejected"
            ? ownerLockedRentalsResult.reason?.message || "Unable to load owner locked rentals."
            : ""
      });

      setIsLoading(false);
    }

    loadWalletData();

    return () => {
      isActive = false;
    };
  }, [token]);

  async function refreshWalletRequests() {
    const data = await apiRequest("/wallet/requests/me", requestOptions);

    setWalletData((current) => ({
      ...current,
      walletRequests: data.walletRequests || []
    }));
    setErrors((current) => ({
      ...current,
      walletRequests: ""
    }));
  }

  function resetTopUpForm() {
    setTopUpAmount("");
    setTopUpNote("");
    setTopUpError("");
  }

  function openTopUpModal() {
    setTopUpSuccess("");
    setTopUpError("");
    setIsTopUpModalOpen(true);
  }

  function closeTopUpModal() {
    setIsTopUpModalOpen(false);
    resetTopUpForm();
  }

  async function handleTopUpSubmit(event) {
    event.preventDefault();

    const amountValue = Number(topUpAmount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setTopUpError("Enter an amount greater than 0.");
      return;
    }

    setIsSubmittingTopUp(true);
    setTopUpError("");
    setTopUpSuccess("");

    try {
      const payload = {
        amount: amountValue
      };

      if (topUpNote.trim()) {
        payload.note = topUpNote.trim();
      }

      await apiRequest("/wallet/requests", {
        ...requestOptions,
        method: "POST",
        body: JSON.stringify(payload)
      });

      await refreshWalletRequests();
      setTopUpSuccess("Top-up request submitted successfully.");
      closeTopUpModal();
      setActiveSection("requests");
      setTopUpSuccess("Top-up request submitted successfully.");
    } catch (error) {
      setTopUpError(error.message || "Unable to submit top-up request.");
    } finally {
      setIsSubmittingTopUp(false);
    }
  }

  const generalBalance = walletData.wallet?.generalBalance ?? 0;
  const lockedBalance = walletData.wallet?.lockedBalance ?? 0;
  const currentBalance = generalBalance + lockedBalance;

  return (
    <ProtectedPage>
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Wallet</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Track your balance and rental funds
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                See what is available to use right now, what is temporarily locked for active
                rentals, and the history behind each wallet movement.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Current Balance includes available and locked funds.</p>
              <p className="mt-1">Locked money is temporarily reserved for active rental requests.</p>
            </div>
          </div>
        </div>

        {isLoading ? <WalletSummaryLoading /> : null}

        {!isLoading ? (
          <>
            {errors.wallet ? <TopErrorState title="Unable to load wallet summary" message={errors.wallet} /> : null}

            {!errors.wallet ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(16rem,0.9fr)]">
                <SummaryCard
                  label="Current Balance"
                  value={formatPrice(currentBalance)}
                  detail="Includes both available and locked funds."
                />
                <SummaryCard
                  label="Available Balance"
                  value={formatPrice(generalBalance)}
                  detail="This is the balance you can use right now."
                />
                <SummaryCard
                  label="Locked Balance"
                  value={formatPrice(lockedBalance)}
                  detail="Owner-held escrow for rentals that are still in progress."
                />
                <TopUpActionCard onClick={openTopUpModal} />
              </div>
            ) : null}

            {topUpSuccess ? <TopUpSuccessState message={topUpSuccess} /> : null}

            <div className="rounded-[2rem] border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.1)] sm:p-4">
              <div className="ui-nav-scroll flex gap-2 overflow-x-auto pb-1">
                {SECTION_CONFIG.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`ui-pill-nav whitespace-nowrap ${
                      activeSection === section.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {activeSection === "transactions" ? (
              <TransactionsSection
                transactions={walletData.transactions}
                errorMessage={errors.transactions}
              />
            ) : null}

            {activeSection === "requests" ? (
              <WalletRequestsSection
                walletRequests={walletData.walletRequests}
                errorMessage={errors.walletRequests}
              />
            ) : null}

            {activeSection === "lockedRentals" ? (
              <LockedRentalsSection
                lockedRentals={walletData.lockedRentals}
                ownerLockedRentals={walletData.ownerLockedRentals}
                renterErrorMessage={errors.lockedRentals}
                ownerErrorMessage={errors.ownerLockedRentals}
              />
            ) : null}
          </>
        ) : null}
      </section>

      {isTopUpModalOpen ? (
        <TopUpRequestModal
          amount={topUpAmount}
          note={topUpNote}
          errorMessage={topUpError}
          isSubmitting={isSubmittingTopUp}
          onAmountChange={setTopUpAmount}
          onNoteChange={setTopUpNote}
          onClose={closeTopUpModal}
          onSubmit={handleTopUpSubmit}
        />
      ) : null}
    </ProtectedPage>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <div className="ui-trust-card">
      <p className="ui-trust-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function TopUpActionCard({ onClick }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-teal-200 bg-teal-50/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Top-Up
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">+ Request Top-Up</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Request wallet balance from admin.
          </p>
        </div>

        <button type="button" onClick={onClick} className="ui-btn-primary w-full justify-center">
          + Request Top-Up
        </button>
      </div>
    </div>
  );
}

function TopUpSuccessState({ message }) {
  return (
    <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 shadow-sm">
      <h2 className="text-xl font-semibold">Request submitted</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function TopUpRequestModal({
  amount,
  note,
  errorMessage,
  isSubmitting,
  onAmountChange,
  onNoteChange,
  onClose,
  onSubmit
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Wallet Request
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Request a top-up</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This sends a balance request to admin. No payment is taken here.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="Enter amount"
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Note</span>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={4}
              placeholder="Optional note for admin"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ui-btn-secondary justify-center disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-btn-primary justify-center disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransactionsSection({ transactions, errorMessage }) {
  return (
    <DetailSectionShell
      eyebrow="Transactions"
      title="Wallet activity"
      description="Review credits, debits, locks, and unlocks tied to your account."
      errorMessage={errorMessage}
      emptyTitle="No wallet transactions yet"
      emptyDescription="Wallet activity will appear here once money is added, used, locked, or released."
      hasItems={transactions.length > 0}
    >
      <div className="grid gap-4">
        {transactions.map((transaction) => (
          <TransactionCard key={transaction._id} transaction={transaction} />
        ))}
      </div>
    </DetailSectionShell>
  );
}

function TransactionCard({ transaction }) {
  const summary = getTransactionPresentation(transaction);
  const contextRows = getTransactionContextRows(transaction);
  const bookHref = getTransactionBookHref(transaction);

  return (
    <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
              {formatDateTime(transaction.createdAt)}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{summary.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{summary.description}</p>
            {summary.bookTitle ? (
              <div className="mt-3 rounded-[1.35rem] border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Book
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">{summary.bookTitle}</p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <InfoRow label="Amount" value={formatPrice(transaction.amount)} />
            <InfoRow label="Direction" value={summary.directionLabel} />
            <InfoRow label="Status" value={toStatusLabel(transaction.status)} />
            <InfoRow label="Type" value={toStatusLabel(transaction.type)} meta={summary.sourceLabel} />
          </div>

          {contextRows.length > 0 ? (
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
              {contextRows.map((item) => (
                <InfoRow key={item.label} label={item.label} value={item.value} meta={item.meta} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getTransactionTone(
              transaction.type
            )}`}
          >
            {summary.badgeLabel}
          </span>
          {bookHref ? (
            <Link href={bookHref} className="ui-btn-secondary px-4 py-2 text-sm">
              View Book
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function WalletRequestsSection({ walletRequests, errorMessage }) {
  return (
    <DetailSectionShell
      eyebrow="Wallet Requests"
      title="Top-up request history"
      description="Review the requests you have already submitted for wallet balance updates."
      errorMessage={errorMessage}
      emptyTitle="No wallet requests yet"
      emptyDescription="If you submit a wallet request, its review status and admin notes will appear here."
      hasItems={walletRequests.length > 0}
    >
      <div className="grid gap-4">
        {walletRequests.map((request) => (
          <article
            key={request._id}
            className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                    Requested {formatDateTime(request.createdAt)}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    {formatPrice(request.amount)}
                  </h2>
                </div>

                <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoRow label="Status" value={toStatusLabel(request.status)} />
                  <InfoRow label="Note" value={request.note || "No note added"} />
                  <InfoRow label="Admin note" value={request.adminNote || "No admin note yet"} />
                  <InfoRow
                    label="Decision timing"
                    value={getWalletRequestDecisionLabel(request)}
                    meta={getWalletRequestDecisionMeta(request)}
                  />
                </div>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWalletRequestTone(
                  request.status
                )}`}
              >
                {toStatusLabel(request.status)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </DetailSectionShell>
  );
}

function LockedRentalsSection({
  lockedRentals,
  ownerLockedRentals,
  renterErrorMessage,
  ownerErrorMessage
}) {
  const renterTotalLocked = lockedRentals.reduce(
    (total, rental) => total + (Number(rental.totalLockedAmount) || 0),
    0
  );
  const ownerTotalLocked = ownerLockedRentals.reduce(
    (total, rental) => total + (Number(rental.totalLockedAmount) || 0),
    0
  );
  const hasRenterItems = lockedRentals.length > 0;
  const hasOwnerItems = ownerLockedRentals.length > 0;
  const hasAnyItems = hasRenterItems || hasOwnerItems;

  return (
    <DetailSectionShell
      eyebrow="Locked Rentals"
      title="Why part of your balance is reserved"
      description="Track both rentals you funded as a renter and rentals you are holding in escrow as the owner, so each locked amount has a clear book-level explanation."
      errorMessage=""
      emptyTitle="No locked rentals right now"
      emptyDescription="Once a rental no longer has locked funds, it will disappear from this list."
      hasItems={hasAnyItems || Boolean(renterErrorMessage) || Boolean(ownerErrorMessage)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Owner Escrow Total"
          value={formatPrice(ownerTotalLocked)}
          detail="This is the portion of your wallet locked balance currently held for books you own."
        />
        <SummaryCard
          label="Renter-Funded Active Rentals"
          value={formatPrice(renterTotalLocked)}
          detail="These rentals were funded by you, but the escrow is now held in the owner's wallet."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LockedRentalGroup
          eyebrow="As Owner"
          title="Escrow you are holding"
          description="These book rentals are the active sources of your locked balance. Each one shows the rent and deposit still being held until settlement."
          emptyTitle="No owner-side locked rentals"
          emptyDescription="When renters start rentals for your books, those escrow entries will appear here."
          errorMessage={ownerErrorMessage}
          hasItems={hasOwnerItems}
        >
          {ownerLockedRentals.map((rental) => (
            <OwnerLockedRentalCard key={rental._id} rental={rental} />
          ))}
        </LockedRentalGroup>

        <LockedRentalGroup
          eyebrow="As Renter"
          title="Rentals you already funded"
          description="These rentals were started by you, and the locked funds now sit in the owner's escrow balance instead of your locked balance."
          emptyTitle="No renter-side funded rentals"
          emptyDescription="Once you use Start Rent, it will appear here while the escrow is still unsettled."
          errorMessage={renterErrorMessage}
          hasItems={hasRenterItems}
        >
          {lockedRentals.map((rental) => (
            <RenterLockedRentalCard key={rental._id} rental={rental} />
          ))}
        </LockedRentalGroup>
      </div>
    </DetailSectionShell>
  );
}

function LockedRentalGroup({
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyDescription,
  errorMessage,
  hasItems,
  children
}) {
  return (
    <div className="space-y-4 rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">{eyebrow}</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {errorMessage ? <TopErrorState title={`Unable to load ${title.toLowerCase()}`} message={errorMessage} /> : null}
      {!errorMessage && !hasItems ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}
      {!errorMessage && hasItems ? <div className="grid gap-4">{children}</div> : null}
    </div>
  );
}

function OwnerLockedRentalCard({ rental }) {
  const renterName = rental.renter?.fullName || rental.renter?.name || "Unknown renter";
  const renterEmail = rental.renter?.email ? ` | ${rental.renter.email}` : "";
  const bookHref = getBookHref(rental.book);

  return (
    <article className="rounded-[1.75rem] border border-white/60 bg-white/90 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
              Escrow locked {formatDateTime(rental.fundsLockedAt)}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {rental.book?.title || "Book unavailable"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {`Renter: ${renterName}${renterEmail}`}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <InfoRow label="Role" value="Owner escrow holder" meta="You are holding the locked amount for this book." />
            <InfoRow label="Locked rent" value={formatPrice(rental.lockedRent)} />
            <InfoRow label="Locked deposit" value={formatPrice(rental.lockedDeposit)} />
            <InfoRow
              label="Total locked amount"
              value={formatPrice(rental.totalLockedAmount)}
              meta={`Settlement: ${toStatusLabel(rental.settlementStatus)}`}
            />
            <InfoRow
              label="Rental status"
              value={toStatusLabel(rental.status)}
              meta={`Payment: ${toStatusLabel(rental.paymentStatus)}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getLockedRentalTone(
              rental.status
            )}`}
          >
            {toStatusLabel(rental.paymentStatus)}
          </span>
          {bookHref ? (
            <Link href={bookHref} className="ui-btn-secondary px-4 py-2 text-sm">
              View Book
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RenterLockedRentalCard({ rental }) {
  const ownerName = rental.owner?.fullName || rental.owner?.name || "Unknown owner";
  const ownerEmail = rental.owner?.email ? ` | ${rental.owner.email}` : "";
  const bookHref = getBookHref(rental.book);

  return (
    <article className="rounded-[1.75rem] border border-white/60 bg-white/90 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
              Started {formatDateTime(rental.paymentConfirmedAt || rental.fundsLockedAt)}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {rental.book?.title || "Book unavailable"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {`Owner escrow holder: ${ownerName}${ownerEmail}`}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <InfoRow
              label="Role"
              value="Renter funding source"
              meta="You funded this rental, and the escrow is held with the owner."
            />
            <InfoRow label="Rent funded" value={formatPrice(rental.lockedRent)} />
            <InfoRow label="Deposit funded" value={formatPrice(rental.lockedDeposit)} />
            <InfoRow
              label="Total locked amount"
              value={formatPrice(rental.totalLockedAmount)}
              meta={`Escrow holder: ${ownerName}`}
            />
            <InfoRow
              label="Rental status"
              value={toStatusLabel(rental.status)}
              meta={`Settlement: ${toStatusLabel(rental.settlementStatus)}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getLockedRentalTone(
              rental.status
            )}`}
          >
            {toStatusLabel(rental.paymentStatus)}
          </span>
          {bookHref ? (
            <Link href={bookHref} className="ui-btn-secondary px-4 py-2 text-sm">
              View Book
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DetailSectionShell({
  eyebrow,
  title,
  description,
  errorMessage,
  emptyTitle,
  emptyDescription,
  hasItems,
  children
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
      </div>

      {errorMessage ? <TopErrorState title={`Unable to load ${title.toLowerCase()}`} message={errorMessage} /> : null}
      {!errorMessage && !hasItems ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}
      {!errorMessage && hasItems ? children : null}
    </section>
  );
}

function InfoRow({ label, value, meta }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800 break-words">{value}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p> : null}
    </div>
  );
}

function WalletSummaryLoading() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
          />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-[2rem] border border-white/60 bg-white/70" />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
          />
        ))}
      </div>
    </div>
  );
}

function TopErrorState({ title, message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
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

function toStatusLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTransactionTone(type) {
  if (type === "credit" || type === "unlock") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (type === "lock") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-rose-50 text-rose-700 border-rose-200";
}

function getWalletRequestTone(status) {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-rose-50 text-rose-700 border-rose-200";
}

function getLockedRentalTone(status) {
  if (status === "return_pending") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (status === "active") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function getTransactionMetaSummary(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return "No extra metadata";
  }

  if (metadata.component) {
    return `Component: ${toStatusLabel(metadata.component)}`;
  }

  if (metadata.source) {
    return `Source: ${toStatusLabel(metadata.source)}`;
  }

  return "Metadata available";
}

function getTransactionPresentation(transaction) {
  const metadata = transaction?.metadata && typeof transaction.metadata === "object" ? transaction.metadata : {};
  const source = metadata.source || "";
  const component = metadata.component || "";
  const description = transaction?.description || "";
  const bookTitle = metadata.bookTitle || "";

  let title = "Wallet transaction";
  let directionLabel = "Wallet movement";

  if (component === "deposit_refund") {
    title = "Deposit refunded";
    directionLabel = "Refund to available balance";
  } else if (component === "rent_release") {
    title = "Rent released";
    directionLabel = "Credit to available balance";
  } else if (component === "escrow_unlock") {
    title = "Escrow unlocked";
    directionLabel = "Locked funds released";
  } else if (source === "rental_start" && transaction.type === "debit") {
    title = "Rental payment";
    directionLabel = "Debited from available balance";
  } else if (source === "rental_start" && transaction.type === "lock") {
    title = "Escrow locked";
    directionLabel = "Added to owner locked balance";
  } else if (source === "admin_credit") {
    title = "Admin credit";
    directionLabel = "Credited to available balance";
  } else if (source === "admin_debit") {
    title = "Admin debit";
    directionLabel = "Debited from available balance";
  } else if (source === "wallet_request_approval") {
    title = "Wallet request approved";
    directionLabel = "Credited to available balance";
  } else if (transaction.type === "credit") {
    title = "Wallet credit";
    directionLabel = "Credited to available balance";
  } else if (transaction.type === "debit") {
    title = "Wallet debit";
    directionLabel = "Debited from available balance";
  } else if (transaction.type === "lock") {
    title = "Funds locked";
    directionLabel = "Moved into locked balance";
  } else if (transaction.type === "unlock") {
    title = "Funds unlocked";
    directionLabel = "Released from locked balance";
  }

  return {
    title,
    description: getTransactionDescription({ title, description, metadata }),
    badgeLabel: title,
    directionLabel,
    sourceLabel: getTransactionSourceLabel(source, component),
    bookTitle
  };
}

function getTransactionDescription({ title, description, metadata }) {
  const bookTitle = metadata.bookTitle || "";

  if (title === "Rental payment" && bookTitle) {
    return `Available balance was used to start the rental for ${bookTitle}.`;
  }

  if (title === "Escrow locked" && bookTitle) {
    return `Escrow for ${bookTitle} is currently being held in the owner's locked balance.`;
  }

  if (title === "Deposit refunded" && bookTitle) {
    return `The security deposit for ${bookTitle} was returned after settlement.`;
  }

  if (title === "Rent released" && bookTitle) {
    return `Rental earnings for ${bookTitle} were released to the owner after return confirmation.`;
  }

  if (title === "Wallet request approved") {
    return "An admin approved a wallet request and added the amount to your available balance.";
  }

  if (title === "Admin credit") {
    return "An admin added funds directly to the wallet.";
  }

  if (title === "Admin debit") {
    return "An admin removed funds directly from the wallet.";
  }

  return description || "Wallet transaction recorded.";
}

function getTransactionSourceLabel(source, component) {
  if (component) {
    return `Purpose: ${toStatusLabel(component)}`;
  }

  if (source) {
    return `Source: ${toStatusLabel(source)}`;
  }

  return "Metadata available when linked";
}

function getTransactionContextRows(transaction) {
  const metadata = transaction?.metadata && typeof transaction.metadata === "object" ? transaction.metadata : {};
  const rows = [];

  if (typeof metadata.lockedRent === "number" || typeof metadata.lockedDeposit === "number") {
    rows.push({
      label: "Escrow breakdown",
      value: `${formatPrice(metadata.lockedRent || 0)} rent`,
      meta: `${formatPrice(metadata.lockedDeposit || 0)} deposit`
    });
  }

  if (metadata.rentalRequestId) {
    rows.push({
      label: "Rental request",
      value: "Rental request linked",
      meta: metadata.component ? `Step: ${toStatusLabel(metadata.component)}` : undefined
    });
  }

  if (metadata.walletRequestId) {
    rows.push({
      label: "Wallet request",
      value: "Wallet request approved",
      meta: "Approved through wallet request flow"
    });
  }

  if (metadata.adminUserId) {
    rows.push({
      label: "Admin context",
      value: "Admin action recorded",
      meta: "Approved by admin"
    });
  }

  if (!rows.length && transaction.referenceId) {
    rows.push({
      label: "Reference",
      value: "Reference available",
      meta: getTransactionMetaSummary(metadata)
    });
  }

  return rows.slice(0, 4);
}

function getBookHref(book) {
  const bookId = book?._id || book?.id || "";

  return bookId ? `/books/${bookId}` : "";
}

function getTransactionBookHref(transaction) {
  const metadata = transaction?.metadata && typeof transaction.metadata === "object" ? transaction.metadata : {};
  const bookId = metadata.bookId || "";

  return bookId ? `/books/${bookId}` : "";
}

function getWalletRequestDecisionLabel(request) {
  if (request.approvedAt) {
    return "Approved";
  }

  if (request.rejectedAt) {
    return "Rejected";
  }

  return "Still pending";
}

function getWalletRequestDecisionMeta(request) {
  if (request.approvedAt) {
    return formatDateTime(request.approvedAt);
  }

  if (request.rejectedAt) {
    return formatDateTime(request.rejectedAt);
  }

  return "Awaiting admin review";
}
