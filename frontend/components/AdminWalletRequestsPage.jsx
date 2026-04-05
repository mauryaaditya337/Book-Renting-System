"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

export function AdminWalletRequestsPage() {
  const { token } = useAuth();
  const [walletRequests, setWalletRequests] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionRequestId, setActionRequestId] = useState("");

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

    async function loadWalletRequests() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest("/wallet/admin/requests", requestOptions);

        if (isActive) {
          setWalletRequests(data.walletRequests || []);
        }
      } catch (error) {
        if (isActive) {
          setWalletRequests([]);
          setErrorMessage(error.message || "Unable to load wallet requests.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadWalletRequests();

    return () => {
      isActive = false;
    };
  }, [requestOptions, token]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return walletRequests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const values = [
        request.user?.fullName,
        request.user?.name,
        request.user?.email
      ];

      return values.some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
    });
  }, [search, statusFilter, walletRequests]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
  };

  const refreshWalletRequests = async (nextSuccessMessage = "") => {
    const data = await apiRequest("/wallet/admin/requests", requestOptions);
    setWalletRequests(data.walletRequests || []);
    setSuccessMessage(nextSuccessMessage);
  };

  const handleApprove = async (request) => {
    if (!window.confirm(`Approve wallet request ${request._id}?`)) {
      return;
    }

    const adminNote = window.prompt("Optional admin note for approval:", "") || "";

    setActionRequestId(request._id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/wallet/admin/requests/${request._id}/approve`, {
        ...requestOptions,
        method: "PATCH",
        body: JSON.stringify({ adminNote })
      });

      await refreshWalletRequests("Wallet request approved successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to approve wallet request.");
    } finally {
      setActionRequestId("");
    }
  };

  const handleReject = async (request) => {
    if (!window.confirm(`Reject wallet request ${request._id}?`)) {
      return;
    }

    const adminNote = window.prompt("Optional admin note for rejection:", "") || "";

    setActionRequestId(request._id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/wallet/admin/requests/${request._id}/reject`, {
        ...requestOptions,
        method: "PATCH",
        body: JSON.stringify({ adminNote })
      });

      await refreshWalletRequests("Wallet request rejected successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to reject wallet request.");
    } finally {
      setActionRequestId("");
    }
  };

  const hasFilters = Boolean(search) || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Wallet Requests
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              Review wallet top-up requests
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Monitor pending, approved, and rejected wallet requests, then approve or reject them
              without leaving the shared admin workspace.
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Request snapshot</p>
            <p className="mt-1">
              {isLoading
                ? "Loading requests..."
                : `${filteredRequests.length} request${filteredRequests.length === 1 ? "" : "s"} shown`}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.32fr)_auto_auto]"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by user name or email"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="submit" className="ui-btn-primary">
            Search
          </button>

          {hasFilters ? (
            <button type="button" onClick={handleClear} className="ui-btn-secondary">
              Clear
            </button>
          ) : null}
        </form>
      </div>

      {successMessage ? <SuccessPanel message={successMessage} /> : null}

      {errorMessage ? (
        <ErrorPanel title="Unable to continue" message={errorMessage} />
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : filteredRequests.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.1)] sm:p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => {
                  const isActing = actionRequestId === request._id;

                  return (
                    <tr key={request._id} className="align-top text-sm text-slate-700">
                      <td className="border-t border-slate-200 px-4 py-4">
                        <p className="font-semibold text-slate-900 break-all">{request._id}</p>
                        <Link
                          href={`/admin/wallet-requests/${request._id}`}
                          className="mt-2 inline-flex text-xs font-medium text-teal-700 hover:text-teal-800"
                        >
                          Open detail
                        </Link>
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        <p className="font-medium text-slate-900">
                          {request.user?.fullName || request.user?.name || "Unknown user"}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {request.user?.email || "No email"}
                        </p>
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        {formatPrice(request.amount)}
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        <StatusPill status={request.status} />
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        <p className="max-w-xs whitespace-pre-wrap text-sm text-slate-600">
                          {request.note || "No note"}
                        </p>
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        {formatDateTime(request.createdAt)}
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        {request.approvedAt ? formatDateTime(request.approvedAt) : null}
                        {request.rejectedAt ? formatDateTime(request.rejectedAt) : null}
                        {!request.approvedAt && !request.rejectedAt ? "Pending" : null}
                      </td>
                      <td className="border-t border-slate-200 px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {request.status === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(request)}
                                disabled={isActing}
                                className="ui-btn-primary min-h-10 px-4 py-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                              >
                                {isActing ? "Working..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(request)}
                                disabled={isActing}
                                className="ui-btn-secondary min-h-10 px-4 py-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <Link href={`/admin/wallet-requests/${request._id}`} className="ui-btn-secondary">
                              View Summary
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>
      {status}
    </span>
  );
}

function SuccessPanel({ message }) {
  return (
    <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 shadow-sm">
      <h3 className="text-xl font-semibold">Action complete</h3>
      <p className="mt-2 text-sm leading-6">{message}</p>
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

function EmptyState({ hasFilters }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">
        {hasFilters ? "No wallet requests matched these filters" : "No wallet requests found"}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {hasFilters
          ? "Try another status or widen the user search."
          : "Wallet requests will appear here once users submit them."}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
        />
      ))}
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
