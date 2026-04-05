"use client";

import { useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

const FILTER_OPTIONS = {
  status: ["pending", "approved", "active", "return_pending", "completed", "rejected"],
  paymentStatus: ["unpaid", "locked", "settled", "refunded"],
  settlementStatus: ["pending", "completed", "refunded"]
};

const INITIAL_FILTERS = {
  status: "",
  paymentStatus: "",
  settlementStatus: ""
};

const EMPTY_SUMMARY = {
  totalRentalRequests: 0,
  activeLockedRentals: 0,
  returnPendingCount: 0,
  completedSettlements: 0,
  totalCurrentlyLockedAmount: 0,
  totalCurrentlyLockedRent: 0,
  totalCurrentlyLockedDeposit: 0
};

const EMPTY_AUDIT = {
  summary: {
    lockedWithoutAmount: 0,
    settledButAmountsRemain: 0,
    activeButUnpaid: 0,
    returnPendingButNotLocked: 0,
    completedButNotSettled: 0,
    missingSettlementTimestamps: 0,
    ownerWalletLockedMismatch: 0
  },
  issues: {
    lockedWithoutAmount: [],
    settledButAmountsRemain: [],
    activeButUnpaid: [],
    returnPendingButNotLocked: [],
    completedButNotSettled: [],
    missingSettlementTimestamps: [],
    ownerWalletLockedMismatch: []
  }
};

const AUDIT_SECTION_CONFIG = [
  {
    key: "lockedWithoutAmount",
    title: "Locked Without Amount",
    description: "Requests marked locked even though the locked total is zero or negative."
  },
  {
    key: "settledButAmountsRemain",
    title: "Settled But Amounts Remain",
    description: "Requests settled or completed but still carrying locked monetary values."
  },
  {
    key: "activeButUnpaid",
    title: "Active But Unpaid",
    description: "Active rentals whose payment state is neither locked nor settled."
  },
  {
    key: "returnPendingButNotLocked",
    title: "Return Pending But Not Locked",
    description: "Return-pending rentals that no longer report locked payment state."
  },
  {
    key: "completedButNotSettled",
    title: "Completed But Not Settled",
    description: "Completed rentals whose settlement or payment state is still incomplete."
  },
  {
    key: "missingSettlementTimestamps",
    title: "Missing Settlement Timestamps",
    description: "Completed settlements missing one or more required timestamps."
  },
  {
    key: "ownerWalletLockedMismatch",
    title: "Owner Wallet Locked Mismatch",
    description: "Owner wallet locked balances that do not match the sum of their locked rentals."
  }
];

export function AdminFinancialDashboard() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [selectedRentalId, setSelectedRentalId] = useState("");
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserWallet, setSelectedUserWallet] = useState(null);
  const [audit, setAudit] = useState(EMPTY_AUDIT);
  const [summaryError, setSummaryError] = useState("");
  const [listError, setListError] = useState("");
  const [auditError, setAuditError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  const isAdmin = Boolean(user?.isAdmin);

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
    if (!token || !isAdmin) {
      return;
    }

    let isActive = true;

    async function loadDashboardBase() {
      setIsBootLoading(true);
      setSummaryError("");
      setListError("");
      setAuditError("");

      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          query.set(key, value);
        }
      });

      const listPath = query.toString()
        ? `/admin/financial/rental-requests?${query.toString()}`
        : "/admin/financial/rental-requests";

      const [summaryResult, listResult, auditResult] = await Promise.allSettled([
        apiRequest("/admin/financial/summary", requestOptions),
        apiRequest(listPath, requestOptions),
        apiRequest("/admin/financial/audit", requestOptions)
      ]);

      if (!isActive) {
        return;
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.summary || EMPTY_SUMMARY);
      } else {
        setSummary(EMPTY_SUMMARY);
        setSummaryError(summaryResult.reason?.message || "Unable to load financial summary.");
      }

      if (listResult.status === "fulfilled") {
        const nextRentalRequests = listResult.value.rentalRequests || [];
        setRentalRequests(nextRentalRequests);
        setListError("");
        setSelectedRentalId((current) => {
          if (current && nextRentalRequests.some((item) => item._id === current)) {
            return current;
          }

          return nextRentalRequests[0]?._id || "";
        });
      } else {
        setRentalRequests([]);
        setSelectedRentalId("");
        setListError(listResult.reason?.message || "Unable to load rental financial list.");
      }

      if (auditResult.status === "fulfilled") {
        setAudit(auditResult.value.audit || EMPTY_AUDIT);
      } else {
        setAudit(EMPTY_AUDIT);
        setAuditError(auditResult.reason?.message || "Unable to load financial audit.");
      }

      setIsBootLoading(false);
    }

    loadDashboardBase();

    return () => {
      isActive = false;
    };
  }, [filters, isAdmin, requestOptions, token]);

  useEffect(() => {
    if (!token || !isAdmin || !selectedRentalId) {
      setSelectedRental(null);
      setDetailError("");
      return;
    }

    let isActive = true;

    async function loadRentalDetail() {
      setIsDetailLoading(true);
      setDetailError("");

      try {
        const data = await apiRequest(
          `/admin/financial/rental-requests/${selectedRentalId}`,
          requestOptions
        );

        if (isActive) {
          setSelectedRental(data.rentalRequest || null);
        }
      } catch (error) {
        if (isActive) {
          setSelectedRental(null);
          setDetailError(error.message);
        }
      } finally {
        if (isActive) {
          setIsDetailLoading(false);
        }
      }
    }

    loadRentalDetail();

    return () => {
      isActive = false;
    };
  }, [isAdmin, requestOptions, selectedRentalId, token]);

  useEffect(() => {
    if (!token || !isAdmin || !selectedUserId) {
      setSelectedUserWallet(null);
      setWalletError("");
      return;
    }

    let isActive = true;

    async function loadUserWallet() {
      setIsWalletLoading(true);
      setWalletError("");

      try {
        const data = await apiRequest(
          `/admin/financial/users/${selectedUserId}/wallet`,
          requestOptions
        );

        if (isActive) {
          setSelectedUserWallet(data);
        }
      } catch (error) {
        if (isActive) {
          setSelectedUserWallet(null);
          setWalletError(error.message);
        }
      } finally {
        if (isActive) {
          setIsWalletLoading(false);
        }
      }
    }

    loadUserWallet();

    return () => {
      isActive = false;
    };
  }, [isAdmin, requestOptions, selectedUserId, token]);

  const selectedListItem = rentalRequests.find((item) => item._id === selectedRentalId) || null;
  const totalAuditIssues = Object.values(audit.summary || {}).reduce(
    (total, count) => total + (Number(count) || 0),
    0
  );

  return (
    <ProtectedPage>
      {!isAuthLoading && !isAdmin ? (
        <AccessDeniedState />
      ) : (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                  Admin Financials
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                  Inspect rental settlements and user wallet state
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Review platform-wide financial totals, inspect individual rental request settlement
                  data, and drill into the renter or owner wallet activity behind a request.
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">Read-only admin visibility</p>
                <p className="mt-1">This dashboard inspects settlement and wallet data without changing it.</p>
              </div>
            </div>
          </div>

          {isBootLoading ? <DashboardLoadingState /> : null}

          {!isBootLoading ? (
            <>
              {summaryError ? (
                <ErrorPanel title="Unable to load financial summary" message={summaryError} />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Total Rental Requests" value={String(summary.totalRentalRequests)} />
                <SummaryCard label="Active Locked Rentals" value={String(summary.activeLockedRentals)} />
                <SummaryCard label="Return Pending" value={String(summary.returnPendingCount)} />
                <SummaryCard label="Completed Settlements" value={String(summary.completedSettlements)} />
                <SummaryCard
                  label="Total Currently Locked Amount"
                  value={formatPrice(summary.totalCurrentlyLockedAmount)}
                />
                <SummaryCard
                  label="Total Currently Locked Rent"
                  value={formatPrice(summary.totalCurrentlyLockedRent)}
                />
                <SummaryCard
                  label="Total Currently Locked Deposit"
                  value={formatPrice(summary.totalCurrentlyLockedDeposit)}
                />
              </div>

              <section className="space-y-4">
                <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
                  <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                    Financial Audit
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                    Consistency checks across rentals and owner wallets
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Review grouped read-only audit results for request state mismatches, missing timestamps,
                    and owner locked-balance differences.
                  </p>
                </div>

                {auditError ? (
                  <ErrorPanel title="Unable to load financial audit" message={auditError} />
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard label="Total Audit Issues" value={String(totalAuditIssues)} />
                      {AUDIT_SECTION_CONFIG.map((section) => (
                        <SummaryCard
                          key={section.key}
                          label={section.title}
                          value={String(audit.summary?.[section.key] || 0)}
                        />
                      ))}
                    </div>

                    {totalAuditIssues === 0 ? (
                      <EmptyPanel
                        title="No audit issues found"
                        description="All configured consistency checks passed for the current rental and wallet data."
                      />
                    ) : (
                      <div className="grid gap-4">
                        {AUDIT_SECTION_CONFIG.map((section) => (
                          <AuditIssueGroup
                            key={section.key}
                            title={section.title}
                            description={section.description}
                            items={audit.issues?.[section.key] || []}
                            issueKey={section.key}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-4">
                  <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                          Rental Financial List
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                          Rental requests with financial state
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Filter the request list, then open a request to inspect the full settlement detail.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <FilterSelect
                          label="Status"
                          value={filters.status}
                          options={FILTER_OPTIONS.status}
                          onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                        />
                        <FilterSelect
                          label="Payment"
                          value={filters.paymentStatus}
                          options={FILTER_OPTIONS.paymentStatus}
                          onChange={(value) =>
                            setFilters((current) => ({ ...current, paymentStatus: value }))
                          }
                        />
                        <FilterSelect
                          label="Settlement"
                          value={filters.settlementStatus}
                          options={FILTER_OPTIONS.settlementStatus}
                          onChange={(value) =>
                            setFilters((current) => ({ ...current, settlementStatus: value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {listError ? (
                    <ErrorPanel title="Unable to load rental financial list" message={listError} />
                  ) : rentalRequests.length === 0 ? (
                    <EmptyPanel
                      title="No rental requests matched these filters"
                      description="Try clearing one or more filters to widen the financial list."
                    />
                  ) : (
                    <div className="grid gap-4">
                      {rentalRequests.map((request) => (
                        <article
                          key={request._id}
                          className={`rounded-[2rem] border bg-white/80 p-5 text-left shadow-[0_20px_60px_rgba(15,23,42,0.1)] transition ${
                            request._id === selectedRentalId
                              ? "border-slate-900 ring-1 ring-slate-900"
                              : "border-white/60"
                          }`}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                                  {formatDateTime(request.createdAt)}
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                                  {request.book?.title || "Book unavailable"}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600 break-all">
                                  Request ID: {request._id}
                                </p>
                              </div>

                              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                                <InfoRow
                                  label="Renter"
                                  value={request.renter?.fullName || "Unknown renter"}
                                  actionLabel="Open wallet"
                                  onAction={() => setSelectedUserId(request.renter?._id || "")}
                                  disableAction={!request.renter?._id}
                                />
                                <InfoRow
                                  label="Owner"
                                  value={request.owner?.fullName || "Unknown owner"}
                                  actionLabel="Open wallet"
                                  onAction={() => setSelectedUserId(request.owner?._id || "")}
                                  disableAction={!request.owner?._id}
                                />
                                <InfoRow
                                  label="Statuses"
                                  value={`${toTitleCase(request.status)} / ${toTitleCase(
                                    request.paymentStatus
                                  )}`}
                                  meta={`Settlement: ${toTitleCase(request.settlementStatus)}`}
                                />
                                <InfoRow
                                  label="Locked amount"
                                  value={formatPrice(request.totalLockedAmount)}
                                />
                              </div>
                            </div>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(
                                request.paymentStatus
                              )}`}
                            >
                              {toTitleCase(request.paymentStatus)}
                            </span>
                          </div>

                          <div className="mt-4 border-t border-slate-200/80 pt-4">
                            <button
                              type="button"
                              onClick={() => setSelectedRentalId(request._id)}
                              className="ui-btn-secondary w-full px-4 py-2"
                            >
                              {request._id === selectedRentalId ? "Viewing detail" : "View financial detail"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
                    <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                      Rental Detail
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                      {selectedListItem?.book?.title || "Select a rental request"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Inspect the request lifecycle, locked amounts, timestamps, and linked users.
                    </p>
                  </div>

                  {isDetailLoading ? <SectionLoadingState /> : null}

                  {!isDetailLoading ? (
                    <>
                      {detailError ? (
                        <ErrorPanel title="Unable to load rental detail" message={detailError} />
                      ) : !selectedRental ? (
                        <EmptyPanel
                          title="No rental request selected"
                          description="Choose a request from the list to inspect its financial detail."
                        />
                      ) : (
                        <RentalDetailCard
                          rentalRequest={selectedRental}
                          onOpenUserWallet={setSelectedUserId}
                        />
                      )}
                    </>
                  ) : null}

                  <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
                    <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                      User Wallet Detail
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                      {selectedUserWallet?.user?.fullName || "Select a renter or owner"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Open a renter or owner from the list or detail panel to inspect wallet balances,
                      recent transactions, requests, and locked rentals.
                    </p>
                  </div>

                  {isWalletLoading ? <SectionLoadingState /> : null}

                  {!isWalletLoading ? (
                    <>
                      {walletError ? (
                        <ErrorPanel title="Unable to load user wallet detail" message={walletError} />
                      ) : !selectedUserWallet ? (
                        <EmptyPanel
                          title="No user selected"
                          description="Choose a renter or owner to inspect their wallet activity and locked rentals."
                        />
                      ) : (
                        <UserWalletCard walletData={selectedUserWallet} />
                      )}
                    </>
                  ) : null}
                </section>
              </div>
            </>
          ) : null}
        </section>
      )}
    </ProtectedPage>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="ui-trust-card">
      <p className="ui-trust-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900 break-words">{value}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {toTitleCase(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function AuditIssueGroup({ title, description, items, issueKey }) {
  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {items.length} issue{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">No items found for this audit check.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item, index) =>
            issueKey === "ownerWalletLockedMismatch" ? (
              <CompactListItem
                key={`${issueKey}-${item.owner?._id || index}`}
                title={item.owner?.fullName || item.owner?.email || "Unknown owner"}
                meta={`Expected ${formatPrice(item.expectedLockedBalance)} | Wallet ${formatPrice(
                  item.walletLockedBalance
                )}`}
                detail={`Difference: ${formatPrice(item.difference)} | Locked rentals: ${item.lockedRentalCount}`}
                aside={item.owner?.email || "Email unavailable"}
              />
            ) : (
              <CompactListItem
                key={`${issueKey}-${item._id || index}`}
                title={item.book?.title || "Book unavailable"}
                meta={`${toTitleCase(item.status)} | ${toTitleCase(item.paymentStatus)} | Settlement: ${toTitleCase(
                  item.settlementStatus
                )}`}
                detail={`Request ${item._id} | Locked total ${formatPrice(item.totalLockedAmount)} | Rent ${formatPrice(
                  item.lockedRent
                )} | Deposit ${formatPrice(item.lockedDeposit)}`}
                aside={item.owner?.fullName || item.renter?.fullName || ""}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function RentalDetailCard({ rentalRequest, onOpenUserWallet }) {
  return (
    <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
              Request ID
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 break-all">{rentalRequest._id}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Book: {rentalRequest.book?.title || "Book unavailable"}
            </p>
          </div>

          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(
              rentalRequest.paymentStatus
            )}`}
          >
            {toTitleCase(rentalRequest.paymentStatus)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoRow label="Status" value={toTitleCase(rentalRequest.status)} />
          <InfoRow label="Payment status" value={toTitleCase(rentalRequest.paymentStatus)} />
          <InfoRow label="Settlement status" value={toTitleCase(rentalRequest.settlementStatus)} />
          <InfoRow label="Total rent" value={formatPrice(rentalRequest.totalRent)} />
          <InfoRow label="Locked rent" value={formatPrice(rentalRequest.lockedRent)} />
          <InfoRow label="Locked deposit" value={formatPrice(rentalRequest.lockedDeposit)} />
          <InfoRow label="Total locked amount" value={formatPrice(rentalRequest.totalLockedAmount)} />
          <InfoRow label="Financial action version" value={String(rentalRequest.financialActionVersion)} />
          <InfoRow label="Payment reference" value={rentalRequest.paymentReference || "Not captured"} />
          <InfoRow label="Payment confirmed" value={formatDateTime(rentalRequest.paymentConfirmedAt)} />
          <InfoRow label="Funds locked" value={formatDateTime(rentalRequest.fundsLockedAt)} />
          <InfoRow label="Settled" value={formatDateTime(rentalRequest.settledAt)} />
          <InfoRow label="Deposit refunded" value={formatDateTime(rentalRequest.depositRefundedAt)} />
          <InfoRow label="Rent released" value={formatDateTime(rentalRequest.rentReleasedAt)} />
          <InfoRow
            label="Book info"
            value={rentalRequest.book?.listingType ? toTitleCase(rentalRequest.book.listingType) : "Unknown"}
            meta={`Security deposit: ${formatPrice(rentalRequest.book?.securityDeposit ?? 0)}`}
          />
          <InfoRow
            label="Renter"
            value={rentalRequest.renter?.fullName || "Unknown renter"}
            meta={rentalRequest.renter?.email || "Email unavailable"}
            actionLabel="Open wallet"
            onAction={() => onOpenUserWallet(rentalRequest.renter?._id || "")}
            disableAction={!rentalRequest.renter?._id}
          />
          <InfoRow
            label="Owner"
            value={rentalRequest.owner?.fullName || "Unknown owner"}
            meta={rentalRequest.owner?.email || "Email unavailable"}
            actionLabel="Open wallet"
            onAction={() => onOpenUserWallet(rentalRequest.owner?._id || "")}
            disableAction={!rentalRequest.owner?._id}
          />
          <InfoRow label="Created" value={formatDateTime(rentalRequest.createdAt)} />
          <InfoRow label="Updated" value={formatDateTime(rentalRequest.updatedAt)} />
        </div>
      </div>
    </article>
  );
}

function UserWalletCard({ walletData }) {
  return (
    <article className="space-y-4">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">User</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {walletData.user?.fullName || "Unknown user"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{walletData.user?.email || "Email unavailable"}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Available balance" value={formatPrice(walletData.wallet?.generalBalance)} />
            <InfoRow label="Locked balance" value={formatPrice(walletData.wallet?.lockedBalance)} />
            <InfoRow label="Wallet created" value={formatDateTime(walletData.wallet?.createdAt)} />
            <InfoRow label="Wallet updated" value={formatDateTime(walletData.wallet?.updatedAt)} />
          </div>
        </div>
      </div>

      <SubsectionCard
        title="Recent Wallet Transactions"
        emptyMessage="No transactions recorded for this user yet."
        items={walletData.transactions}
        renderItem={(transaction) => (
          <CompactListItem
            key={transaction._id}
            title={`${toTitleCase(transaction.type)} - ${formatPrice(transaction.amount)}`}
            meta={`${toTitleCase(transaction.status)} • ${formatDateTime(transaction.createdAt)}`}
            detail={transaction.description || transaction.referenceId || "No description"}
            aside={transaction.metadata?.source ? `Source: ${toTitleCase(transaction.metadata.source)}` : ""}
          />
        )}
      />

      <SubsectionCard
        title="Recent Wallet Requests"
        emptyMessage="No wallet requests recorded for this user yet."
        items={walletData.walletRequests}
        renderItem={(request) => (
          <CompactListItem
            key={request._id}
            title={`${formatPrice(request.amount)} - ${toTitleCase(request.status)}`}
            meta={formatDateTime(request.createdAt)}
            detail={request.note || "No note"}
            aside={request.adminNote || getWalletRequestDecisionLine(request)}
          />
        )}
      />

      <SubsectionCard
        title="Current Locked Rentals"
        emptyMessage="This user has no renter-side locked rentals right now."
        items={walletData.lockedRentals}
        renderItem={(rental) => (
          <CompactListItem
            key={rental.requestId}
            title={rental.bookTitle || "Book unavailable"}
            meta={`${toTitleCase(rental.status)} • ${formatPrice(rental.totalLockedAmount)} locked`}
            detail={`Rent: ${formatPrice(rental.lockedRent)} • Deposit: ${formatPrice(rental.lockedDeposit)}`}
            aside={rental.ownerName || "Unknown owner"}
          />
        )}
      />
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

function InfoRow({ label, value, meta, actionLabel, onAction, disableAction = false }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            disabled={disableAction}
            className="text-xs font-medium text-teal-700 transition hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-medium text-slate-800 break-words">{value || "Not available"}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-500 break-words">{meta}</p> : null}
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
            />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
            />
          ))}
        </div>
      </div>
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

function ErrorPanel({ title, message }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function AccessDeniedState() {
  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-700">Admin Only</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">You do not have access to this dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          This financial dashboard is reserved for admin accounts. If you expected access, please
          sign in with an admin profile.
        </p>
      </div>
    </section>
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

function getStatusTone(status) {
  if (status === "locked") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "settled" || status === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "return_pending") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
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
