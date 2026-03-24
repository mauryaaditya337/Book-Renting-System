"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

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
  const { token, user, isLoading, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    collegeName: "",
    phoneNumber: "",
    city: "",
    state: "",
    address: "",
    bio: "",
    qualification: "",
    currentDegree: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      fullName: user?.fullName || user?.name || "",
      collegeName: user?.collegeName || "",
      phoneNumber: user?.phoneNumber || user?.phone || "",
      city: user?.city || "",
      state: user?.state || "",
      address: user?.address || "",
      bio: user?.bio || "",
      qualification: user?.qualification || "",
      currentDegree: user?.currentDegree || ""
    });
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
    setFormData({
      fullName: user?.fullName || user?.name || "",
      collegeName: user?.collegeName || "",
      phoneNumber: user?.phoneNumber || user?.phone || "",
      city: user?.city || "",
      state: user?.state || "",
      address: user?.address || "",
      bio: user?.bio || "",
      qualification: user?.qualification || "",
      currentDegree: user?.currentDegree || ""
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFormError("Please log in again to update your profile.");
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    try {
      await apiRequest("/users/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          collegeName: formData.collegeName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          address: formData.address.trim(),
          bio: formData.bio.trim(),
          qualification: formData.qualification.trim(),
          currentDegree: formData.currentDegree.trim()
        })
      });

      await refreshProfile();
      setSuccessMessage("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      if (Array.isArray(error.details) && error.details.length > 0) {
        const nextFieldErrors = {};
        const generalErrors = [];

        error.details.forEach((detail) => {
          if (detail.field) {
            nextFieldErrors[detail.field] = detail.message;
          } else {
            generalErrors.push(detail.message);
          }
        });

        setFieldErrors(nextFieldErrors);
        if (generalErrors.length > 0) {
          setFormError(generalErrors.join(", "));
        }
      } else {
        setFormError(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

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
                Keep your profile current so other readers can trust who they are meeting.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
                {isLoading ? "Refreshing profile..." : "Authenticated"}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing((current) => !current);
                  setFieldErrors({});
                  setFormError("");
                  setSuccessMessage("");
                }}
                className="rounded-3xl bg-teal-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-teal-800"
              >
                {isEditing ? "Close Edit" : "Edit Profile"}
              </button>
            </div>
          </div>

          {successMessage ? (
            <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ProfileField label="Full name" value={user?.fullName || user?.name || "Not added"} />
            <ProfileField label="Email" value={user?.email} />
            <ProfileField label="College name" value={user?.collegeName || "Not added"} />
            <ProfileField label="Phone number" value={user?.phoneNumber || user?.phone || "Not added"} />
            <ProfileField label="Current degree" value={user?.currentDegree || "Not added"} />
            <ProfileField label="Qualification" value={user?.qualification || "Not added"} />
            <ProfileField label="City" value={user?.city || "Not added"} />
            <ProfileField label="State" value={user?.state || "Not added"} />
            <ProfileField label="Address" value={user?.address || "Not added"} />
            <ProfileField label="Bio" value={user?.bio || "Not added"} />
            <ProfileField label="Joined" value={formatDate(user?.createdAt)} />
          </div>

          {isEditing ? (
            <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
              <InputField
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                error={fieldErrors.fullName}
                required
              />
              <InputField
                label="College Name"
                name="collegeName"
                value={formData.collegeName}
                onChange={handleChange}
                error={fieldErrors.collegeName}
                required
              />
              <InputField
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                error={fieldErrors.phoneNumber}
              />
              <InputField
                label="Current Degree"
                name="currentDegree"
                value={formData.currentDegree}
                onChange={handleChange}
                error={fieldErrors.currentDegree}
              />
              <InputField
                label="Qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                error={fieldErrors.qualification}
              />
              <InputField
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                error={fieldErrors.city}
              />
              <InputField
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                error={fieldErrors.state}
              />
              <TextAreaField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                error={fieldErrors.address}
                rows={3}
              />
              <TextAreaField
                label="Bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                error={fieldErrors.bio}
                rows={4}
              />

              <div className="sm:col-span-2 space-y-4">
                {formError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSaving ? "Saving..." : "Save Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : null}
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

function InputField({ error, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </label>
  );
}

function TextAreaField({ error, label, rows = 4, ...props }) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        {...props}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </label>
  );
}
