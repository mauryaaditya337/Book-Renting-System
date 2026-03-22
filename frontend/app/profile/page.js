"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  return (
    <ProtectedPage>
      <section className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                Protected Page
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Your profile</h1>
              <p className="mt-2 text-sm text-slate-600">
                Loaded from the backend after login using the stored auth token.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
              {isLoading ? "Refreshing profile..." : "Authenticated"}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ProfileField label="Name" value={user?.name} />
            <ProfileField label="Email" value={user?.email} />
            <ProfileField label="Phone" value={user?.phone || "Not added"} />
            <ProfileField label="City" value={user?.city || "Not added"} />
            <ProfileField label="State" value={user?.state || "Not added"} />
            <ProfileField label="Pincode" value={user?.pincode || "Not added"} />
            <ProfileField label="Address line 1" value={user?.addressLine1 || "Not added"} />
            <ProfileField label="Address line 2" value={user?.addressLine2 || "Not added"} />
            <ProfileField label="Bio" value={user?.bio || "Not added"} />
            <ProfileField label="Joined" value={formatDate(user?.createdAt)} />
          </div>
        </div>
      </section>
    </ProtectedPage>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}
