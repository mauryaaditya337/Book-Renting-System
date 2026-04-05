"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/books";

export function AdminWalletRequestDetailPage({ id }) {
  const { token } = useAuth();
  const [walletRequest, setWalletRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

    async function loadWalletRequest() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await apiRequest(`/admin/wallet-requests/${id}`, requestOptions);

        if (isActive) {
          setWalletRequest(data.walletRequest || null);
        }
      } catch (error) {
        if (isActive) {
          setWalletRequest(null);
          setErrorMessage(error.message || "Unable to load wallet request detail.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadWalletRequest();

    return () => {
      isActive = false;
    };
  }, [id, requestOptions, token]);

  const refreshWalletRequest = async (message = "") => {
    const data = await apiRequest(`/admin/wallet-requests/${id}`, requestOptions);
    setWalletRequest(data.walletRequest || null);
    setSuccessMessage(message);
  };

  const handleDecision = async (decision) => {
    if (!walletRequest || walletRequest.status !== "pending") {
      return;
    }

    const label = decision === "approve" ? "Approve" : "Reject";

    if (!window.confirm(`${label} wallet request ${walletRequest._id}?`)) {
      return;
    }

    const adminNote =
      window.prompt(`Optional admin note for ${decision === "approve" ? "approval" : "rejection"}:`, "") || "";

    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/wallet/admin/requests/${walletRequest._id}/${decision}`, {
        ...requestOptions,
        method: "PATCH",
        body: JSON.stringify({ adminNote })
      });

      await refreshWalletRequest(`Wallet request ${decision}d successfully.`);
    } catch (error) {
      setErrorMessage(error.message || `Unable to ${decision} wallet request.`);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
              Wallet Request Detail
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              {isLoading ? "Loading request..." : walletRequest?._id || "Wallet request detail"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Review the request summary, user context, admin notes, and approval metadata from one
              read-only admin view, with approve and reject actions for pending requests.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/wallet-requests" className="ui-btn-secondary">
              Back to Requests
            </Link>
            {walletRequest?.user?._id ? (
              <Link href={`/admin/users/${walletRequest.user._id}`} className="ui-btn-secondary">
                Open User
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 shadow-sm">
          <h3 className="text-xl font-semibold">Action complete</h3>
          <p className="mt-2 text-sm leading-6">{successMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <ErrorPanel title="Unable to continue" message={errorMessage} />
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : !walletRequest ? (
        <EmptyPanel
          title="Wallet request not found"
          description="The requested wallet request could not be found or is no longer available."
        />
      ) : (
        <>
          <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-700">
                  Request Summary
                </p>
                <h3 className="mt-2 break-all text-xl font-semibold text-slate-900">
                  {walletRequest._id}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Amount: {formatPrice(walletRequest.amount)}
                </p>
              </div>

              <StatusPill status={walletRequest.status} />
            </div>

            {walletRequest.status === "pending" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDecision("approve")}
                  disabled={isActionLoading}
                  className="ui-btn-primary disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {isActionLoading ? "Working..." : "Approve Request"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("reject")}
                  disabled={isActionLoading}
                  className="ui-btn-secondary disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  Reject Request
                </button>
              </div>
            ) : null}
          </article>

          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Request Info">
              <InfoRow label="Amount" value={formatPrice(walletRequest.amount)} />
              <InfoRow label="Status" value={walletRequest.status} />
              <InfoRow label="User note" value={walletRequest.note || "No note"} />
              <InfoRow label="Admin note" value={walletRequest.adminNote || "No admin note"} />
              <InfoRow label="Created" value={formatDateTime(walletRequest.createdAt)} />
              <InfoRow label="Updated" value={formatDateTime(walletRequest.updatedAt)} />
            </SectionCard>

            <SectionCard title="User Info">
              <InfoRow
                label="Name"
                value={walletRequest.user?.fullName || walletRequest.user?.name || "Unknown user"}
              />
              <InfoRow label="Email" value={walletRequest.user?.email || "Not available"} />
              {walletRequest.user?._id ? (
                <>
                  <Link href={`/admin/users/${walletRequest.user._id}`} className="ui-btn-secondary inline-flex">
                    Open User Detail
                  </Link>
                  <Link href={`/admin/financial`} className="ui-btn-secondary inline-flex">
                    Open Financial Section
                  </Link>
                </>
              ) : null}
            </SectionCard>

            <SectionCard title="Decision Metadata">
              <InfoRow
                label="Approved by"
                value={walletRequest.approvedBy?.fullName || walletRequest.approvedBy?.name || "Not approved"}
              />
              <InfoRow label="Approved at" value={formatDateTime(walletRequest.approvedAt)} />
              <InfoRow
                label="Rejected by"
                value={walletRequest.rejectedBy?.fullName || walletRequest.rejectedBy?.name || "Not rejected"}
              />
              <InfoRow label="Rejected at" value={formatDateTime(walletRequest.rejectedAt)} />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <article className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">{title}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-800">{value || "Not available"}</p>
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

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[2rem] border border-white/60 bg-white/70"
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
