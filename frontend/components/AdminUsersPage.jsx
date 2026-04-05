"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

export function AdminUsersPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [users, setUsers] = useState([]);
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

    async function loadUsers() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const searchParams = new URLSearchParams();

        if (search) {
          searchParams.set("search", search);
        }

        const path = searchParams.toString()
          ? `/admin/users?${searchParams.toString()}`
          : "/admin/users";
        const data = await apiRequest(path, requestOptions);

        if (isActive) {
          setUsers(data.users || []);
        }
      } catch (error) {
        if (isActive) {
          setUsers([]);
          setErrorMessage(error.message || "Unable to load users.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isActive = false;
    };
  }, [requestOptions, search, token]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleSearchReset = () => {
    setSearchInput("");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Users</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-[2rem]">
              Review platform users
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Browse user accounts, spot admin access quickly, and open a user detail view for
              wallet and account context.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex w-full flex-col gap-3 sm:max-w-xl sm:flex-row">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email"
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
            <button type="submit" className="ui-btn-primary">
              Search
            </button>
            {search ? (
              <button type="button" onClick={handleSearchReset} className="ui-btn-secondary">
                Clear
              </button>
            ) : null}
          </form>
        </div>
      </div>

      {errorMessage ? (
        <ErrorPanel title="Unable to load users" message={errorMessage} />
      ) : isLoading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <article
              key={user._id}
              className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-semibold text-slate-900">
                        {user.fullName || user.name || "Unknown user"}
                      </p>
                      {user.isAdmin ? (
                        <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                          Admin
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{user.email}</p>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <InfoRow label="Created" value={formatDateTime(user.createdAt)} />
                    <InfoRow label="Role" value={user.isAdmin ? "Admin" : "User"} />
                    <InfoRow label="User ID" value={user._id} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/users/${user._id}`} className="ui-btn-secondary">
                    Open User Detail
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
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

function EmptyState({ search }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
      <h3 className="text-2xl font-semibold text-slate-900">
        {search ? "No users matched this search" : "No users found"}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {search
          ? "Try a different name or email search to widen the result set."
          : "User accounts will appear here once the platform has registered users."}
      </p>
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
