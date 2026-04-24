"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { ToastViewport } from "@/components/ToastViewport";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { formatAverageRating, renderStars } from "@/lib/reviews";

const ACCOUNT_SHORTCUTS = [
  {
    href: "/my-listings",
    label: "My Listings",
    description: "Manage the books you have added to your shelf."
  },
  {
    href: "/my-requests",
    label: "My Requests",
    description: "Track the books you have requested from other readers."
  },
  {
    href: "/my-feedback",
    label: "My Feedback",
    description: "Review the feedback tied to your account activity."
  }
];

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getDisplayName(user) {
  return user?.fullName || user?.name || "Your account";
}

function getProfileInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || "U";
}

function isFieldComplete(value) {
  return Boolean(String(value || "").trim());
}

function getProfileCompletion(user) {
  const trackedFields = [
    user?.fullName || user?.name || "",
    user?.email || "",
    user?.collegeName || "",
    user?.phoneNumber || user?.phone || "",
    user?.currentDegree || "",
    user?.qualification || "",
    user?.city || "",
    user?.state || "",
    user?.address || "",
    user?.bio || ""
  ];

  const completedFields = trackedFields.filter(isFieldComplete).length;
  return Math.round((completedFields / trackedFields.length) * 100);
}

function getProfilePrompt(completion) {
  if (completion >= 90) {
    return "Your account looks complete and ready for confident book handoffs.";
  }

  if (completion >= 60) {
    return "A few more details will make your account feel more trustworthy to other readers.";
  }

  return "Finish the core details so other readers know who they are coordinating with.";
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
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    reviews: []
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

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

  useEffect(() => {
    let isActive = true;

    async function loadReviews() {
      if (!user?.id) {
        if (isActive) {
          setReviewStats({
            averageRating: 0,
            totalReviews: 0,
            reviews: []
          });
          setIsLoadingReviews(false);
        }
        return;
      }

      setIsLoadingReviews(true);

      try {
        const data = await apiRequest(`/reviews/user/${user.id}`, {
          cache: "no-store"
        });

        if (!isActive) {
          return;
        }

        setReviewStats({
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0,
          reviews: Array.isArray(data.reviews) ? data.reviews.slice(0, 3) : []
        });
      } catch (_error) {
        if (isActive) {
          setReviewStats({
            averageRating: 0,
            totalReviews: 0,
            reviews: []
          });
        }
      } finally {
        if (isActive) {
          setIsLoadingReviews(false);
        }
      }
    }

    loadReviews();

    return () => {
      isActive = false;
    };
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

  const displayName = getDisplayName(user);
  const accountEmail = user?.email || "Email not available";
  const profileCompletion = getProfileCompletion(user);
  const completionMessage = getProfilePrompt(profileCompletion);

  if (isLoading && !user) {
    return (
      <ProtectedPage>
        <ProfileLoadingState />
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <section className="mx-auto max-w-6xl space-y-6">
        <ToastViewport
          toasts={[
            successMessage
              ? {
                  id: `profile-success-${successMessage}`,
                  tone: "success",
                  title: "Profile saved",
                  message: successMessage,
                  onDismiss: () => setSuccessMessage("")
                }
              : null
          ]}
        />
        <div className="profile-hero-card ui-surface overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="profile-avatar">
                <span>{getProfileInitial(user)}</span>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">
                  Account
                </p>
                <h1 className="mt-3 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-2 break-words text-sm text-slate-600 sm:text-base">
                  {accountEmail}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Keep your account current so other readers can trust who they are meeting,
                  messaging, and coordinating rentals with.
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <IdentityPill label={isLoading ? "Refreshing profile..." : "Authenticated"} />
                  <IdentityPill label={`Joined ${formatDate(user?.createdAt)}`} tone="light" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="ui-trust-card">
              <p className="ui-trust-label">Account identity</p>
              <p className="ui-trust-value">{displayName}</p>
              <p className="ui-trust-copy">
                Readers rely on your profile name and email context to know who they are meeting.
              </p>
            </div>
            <div className="ui-trust-card">
              <p className="ui-trust-label">Pickup context</p>
              <p className="ui-trust-value">{user?.collegeName || user?.city || "Add your campus or area"}</p>
              <p className="ui-trust-copy">
                Location and college details help make handoffs feel safer and more predictable.
              </p>
            </div>
            <div className="ui-trust-card">
              <p className="ui-trust-label">Why completeness helps</p>
              <p className="ui-trust-value">{profileCompletion}% profile completion</p>
              <p className="ui-trust-copy">
                A fuller account gives owners and renters more confidence during requests and returns.
              </p>
            </div>
            <div className="ui-trust-card">
              <p className="ui-trust-label">Community rating</p>
              <p className="ui-trust-value">
                {isLoadingReviews
                  ? "Loading..."
                  : reviewStats.totalReviews > 0
                    ? `${formatAverageRating(reviewStats.averageRating)} / 5`
                    : "No reviews yet"}
              </p>
              <p className="ui-trust-copy">
                {isLoadingReviews
                  ? "Fetching your latest trust signals."
                  : reviewStats.totalReviews > 0
                    ? `${renderStars(reviewStats.averageRating)} from ${reviewStats.totalReviews} completed transaction review${reviewStats.totalReviews > 1 ? "s" : ""}.`
                    : "Completed rentals and orders can add reviews here over time."}
              </p>
            </div>
          </div>
        </div>

            <div className="profile-hero-aside">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Profile completion
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <p className="text-4xl font-semibold text-slate-900">{profileCompletion}%</p>
                  <p className="pb-1 text-sm text-slate-500">filled</p>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{completionMessage}</p>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setFieldErrors({});
                    setFormError("");
                    setSuccessMessage("");
                  }}
                  className="ui-btn-primary w-full"
                >
                  Edit profile
                </button>
              ) : (
                <div className="ui-feedback-info">
                  Editing is on. Update the fields below and save when you are ready.
                </div>
              )}
            </div>
          </div>

        </div>

        <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <ProfileSection
              title="Personal information"
              description="The core identity details readers will rely on when interacting with your account."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  label="Full name"
                  value={user?.fullName || user?.name || "Not added"}
                  hint="Use the name you want other readers to recognize."
                  isEditing={isEditing}
                  inputProps={{
                    name: "fullName",
                    value: formData.fullName,
                    onChange: handleChange,
                    required: true
                  }}
                  error={fieldErrors.fullName}
                />
                <ProfileField
                  label="Email"
                  value={user?.email || "Not added"}
                  hint="Your sign-in identity for the account."
                />
                <ProfileField
                  label="Current degree"
                  value={user?.currentDegree || "Not added"}
                  hint="Add the degree you are currently pursuing."
                  isEditing={isEditing}
                  inputProps={{
                    name: "currentDegree",
                    value: formData.currentDegree,
                    onChange: handleChange
                  }}
                  error={fieldErrors.currentDegree}
                />
                <ProfileField
                  label="Qualification"
                  value={user?.qualification || "Not added"}
                  hint="Share your academic background if it helps readers know you better."
                  isEditing={isEditing}
                  inputProps={{
                    name: "qualification",
                    value: formData.qualification,
                    onChange: handleChange
                  }}
                  error={fieldErrors.qualification}
                />
                <ProfileField
                  label="Bio"
                  value={user?.bio || "Not added"}
                  hint="A short bio helps make your account feel more real and approachable."
                  isEditing={isEditing}
                  isTextArea
                  className="sm:col-span-2"
                  inputProps={{
                    name: "bio",
                    value: formData.bio,
                    onChange: handleChange,
                    rows: 4
                  }}
                  error={fieldErrors.bio}
                />
              </div>
            </ProfileSection>

            <ProfileSection
              title="Contact information"
              description="These details help readers coordinate pickup, drop-off, or account-related communication."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  label="College name"
                  value={user?.collegeName || "Not added"}
                  hint="Your campus or institution helps set context and trust."
                  isEditing={isEditing}
                  inputProps={{
                    name: "collegeName",
                    value: formData.collegeName,
                    onChange: handleChange,
                    required: true
                  }}
                  error={fieldErrors.collegeName}
                />
                <ProfileField
                  label="Phone number"
                  value={user?.phoneNumber || user?.phone || "Not added"}
                  hint="Share a reachable number if you want easier coordination."
                  isEditing={isEditing}
                  inputProps={{
                    name: "phoneNumber",
                    value: formData.phoneNumber,
                    onChange: handleChange
                  }}
                  error={fieldErrors.phoneNumber}
                />
              </div>
            </ProfileSection>

            <ProfileSection
              title="Address and location"
              description="Location details help make in-person exchanges smoother and more predictable."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  label="City"
                  value={user?.city || "Not added"}
                  hint="Your city helps readers understand your area."
                  isEditing={isEditing}
                  inputProps={{
                    name: "city",
                    value: formData.city,
                    onChange: handleChange
                  }}
                  error={fieldErrors.city}
                />
                <ProfileField
                  label="State"
                  value={user?.state || "Not added"}
                  hint="Add your state for a more complete public identity."
                  isEditing={isEditing}
                  inputProps={{
                    name: "state",
                    value: formData.state,
                    onChange: handleChange
                  }}
                  error={fieldErrors.state}
                />
                <ProfileField
                  label="Address"
                  value={user?.address || "Not added"}
                  hint="A fuller address can help with meetup planning when needed."
                  isEditing={isEditing}
                  isTextArea
                  className="sm:col-span-2"
                  inputProps={{
                    name: "address",
                    value: formData.address,
                    onChange: handleChange,
                    rows: 3
                  }}
                  error={fieldErrors.address}
                />
              </div>
            </ProfileSection>
          </div>

          <aside className="space-y-6">
            <div className="profile-sidebar-card">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Account actions
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {isEditing ? "Save your updates" : "Manage this account"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isEditing
                    ? "Review your edits carefully before saving them to your account."
                    : "Keep your details accurate so your account feels dependable and complete."}
                </p>
              </div>

              {formError ? <p className="request-feedback-error">{formError}</p> : null}

              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <button type="submit" disabled={isSaving} className="ui-btn-primary w-full">
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" onClick={handleCancel} className="ui-btn-secondary w-full">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setFieldErrors({});
                    setFormError("");
                    setSuccessMessage("");
                  }}
                  className="ui-btn-dark w-full"
                >
                  Edit profile
                </button>
              )}
            </div>

            <div className="profile-sidebar-card">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Shortcuts
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Jump to your activity</h2>
              </div>

              <div className="space-y-3">
                {ACCOUNT_SHORTCUTS.map((shortcut) => (
                  <Link key={shortcut.href} href={shortcut.href} className="profile-shortcut">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{shortcut.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{shortcut.description}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="profile-sidebar-card">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Recent reviews
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Trust from completed orders</h2>
              </div>

              {isLoadingReviews ? (
                <p className="text-sm text-slate-600">Loading reviews...</p>
              ) : reviewStats.reviews.length === 0 ? (
                <p className="text-sm leading-6 text-slate-600">
                  Completed orders will start building your public trust record here.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviewStats.reviews.map((review) => (
                    <div key={review.id} className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {review.reviewer?.name || "Reader"} • {renderStars(review.rating)}
                      </p>
                      {review.comment ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-slate-500">No written comment shared.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </form>
      </section>
    </ProtectedPage>
  );
}

function ProfileSection({ children, description, title }) {
  return (
    <section className="profile-section-card">
      <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ProfileField({
  className = "",
  error,
  hint,
  inputProps,
  isEditing = false,
  isTextArea = false,
  label,
  value
}) {
  const hasValue = value && value !== "Not added";

  return (
    <div className={`profile-field-card ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            hasValue
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {hasValue ? "Added" : "Recommended"}
        </span>
      </div>

      {isEditing && inputProps ? (
        <>
          {isTextArea ? (
            <textarea {...inputProps} className="ui-textarea mt-3 text-sm" />
          ) : (
            <input {...inputProps} className="ui-input mt-3 text-sm" />
          )}
          {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </>
      ) : (
        <>
          <p className={`mt-3 text-sm leading-6 ${hasValue ? "text-slate-800" : "text-slate-500"}`}>
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
        </>
      )}
    </div>
  );
}

function IdentityPill({ label, tone = "dark" }) {
  return (
    <div
      className={`rounded-full px-4 py-2.5 text-sm font-medium ${
        tone === "light" ? "bg-white text-slate-700 shadow-sm" : "bg-slate-900 text-slate-100"
      }`}
    >
      {label}
    </div>
  );
}

function ProfileLoadingState() {
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="profile-hero-card ui-surface overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="ui-skeleton h-24 w-24 rounded-[2rem]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="ui-skeleton-line w-24" />
              <div className="ui-skeleton-title w-64 max-w-full" />
              <div className="ui-skeleton-line w-52 max-w-full" />
              <div className="ui-skeleton-line w-full" />
              <div className="flex flex-wrap gap-2.5">
                <div className="ui-skeleton-pill w-36" />
                <div className="ui-skeleton-pill w-32" />
              </div>
            </div>
          </div>

          <div className="profile-hero-aside space-y-4">
            <div className="ui-skeleton-line w-28" />
            <div className="ui-skeleton-title w-24" />
            <div className="ui-skeleton h-2.5 w-full rounded-full" />
            <div className="ui-skeleton-line w-full" />
            <div className="ui-skeleton-button w-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="profile-section-card">
              <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
                <div className="ui-skeleton-title w-52" />
                <div className="ui-skeleton-line mt-3 w-full" />
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                {Array.from({ length: sectionIndex === 0 ? 5 : 3 }).map((__, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className={`profile-field-card ${sectionIndex === 0 && fieldIndex === 4 ? "sm:col-span-2" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="ui-skeleton-line w-24" />
                      <div className="ui-skeleton-pill w-20" />
                    </div>
                    <div className="ui-skeleton-line mt-4 w-3/4" />
                    <div className="ui-skeleton-line mt-2 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="profile-sidebar-card">
              <div className="ui-skeleton-line w-24" />
              <div className="ui-skeleton-title w-40" />
              <div className="ui-skeleton-line w-full" />
              <div className="ui-skeleton-button w-full" />
              {index === 1 ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((__, shortcutIndex) => (
                    <div key={shortcutIndex} className="ui-skeleton h-20 rounded-[1.35rem]" />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
