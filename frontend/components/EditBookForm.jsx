"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BookImageUploader } from "@/components/BookImageUploader";
import { FieldMessage } from "@/components/FieldMessage";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { ToastViewport } from "@/components/ToastViewport";
import { apiRequest } from "@/lib/api";
import { requestBrowserLocation } from "@/lib/location";

const MapCoordinatePicker = dynamic(
  () => import("@/components/MapCoordinatePicker").then((module) => module.MapCoordinatePicker),
  {
    ssr: false
  }
);

const MAX_IMAGE_FIELDS = 3;

const initialFormData = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  description: "",
  condition: "Good",
  listingType: "rent",
  rentalPrice: "",
  salePrice: "",
  securityDeposit: "",
  location: "",
  pickupLocationName: "",
  latitude: "",
  longitude: "",
  meetupLocation: "",
  depositNote: "",
  images: [""]
};

const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];
const listingTypeOptions = [
  {
    value: "rent",
    label: "Rent",
    description: "Show weekly rent and security deposit."
  },
  {
    value: "sell",
    label: "Sell",
    description: "Show a sale price only."
  },
  {
    value: "both",
    label: "Both",
    description: "Offer weekly rent and sale price in one listing."
  }
];

function normalizeImages(images = []) {
  return images.map((image) => image.trim()).filter(Boolean);
}

function withAtLeastOneImageField(images = []) {
  if (!Array.isArray(images) || images.length === 0) {
    return [""];
  }

  return images.slice(0, MAX_IMAGE_FIELDS);
}

function toFormData(book) {
  return {
    title: book?.title || "",
    author: book?.author || "",
    isbn: book?.isbn || "",
    category: book?.category || "",
    description: book?.description || "",
    condition: book?.condition || "Good",
    listingType: book?.listingType || "rent",
    rentalPrice:
      typeof book?.rentalPrice === "number" && book.listingType !== "sell"
        ? String(book.rentalPrice)
        : "",
    salePrice: typeof book?.salePrice === "number" ? String(book.salePrice) : "",
    securityDeposit:
      typeof book?.securityDeposit === "number" && book.listingType !== "sell"
        ? String(book.securityDeposit)
        : "",
    location: book?.location || "",
    pickupLocationName: book?.pickupLocationName || "",
    latitude: typeof book?.latitude === "number" ? String(book.latitude) : "",
    longitude: typeof book?.longitude === "number" ? String(book.longitude) : "",
    meetupLocation: book?.meetupLocation || "",
    depositNote: book?.listingType === "sell" ? "" : book?.depositNote || "",
    images: withAtLeastOneImageField(book?.images || (book?.imageUrl ? [book.imageUrl] : [""]))
  };
}

function normalizeEntityId(value) {
  if (!value) {
    return "";
  }

  return String(value);
}

export function EditBookForm({ bookId }) {
  const router = useRouter();
  const { token, user } = useAuth();

  const [book, setBook] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadBook() {
      setIsLoadingBook(true);
      setFormError("");

      try {
        const data = await apiRequest(`/books/${bookId}`, {
          cache: "no-store"
        });

        if (!isActive) {
          return;
        }

        setBook(data.book || null);
        setFormData(toFormData(data.book));
      } catch (error) {
        if (isActive) {
          setFormError(error.message);
        }
      } finally {
        if (isActive) {
          setIsLoadingBook(false);
        }
      }
    }

    loadBook();

    return () => {
      isActive = false;
    };
  }, [bookId]);

  const ownerId = normalizeEntityId(book?.owner?.id || book?.owner?._id);
  const currentUserId = normalizeEntityId(user?.id || user?._id);
  const isOwner = Boolean(ownerId && currentUserId && ownerId === currentUserId);

  const isRentalListing = formData.listingType !== "sell";
  const isSaleListing = formData.listingType !== "rent";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  };

  const handleUseCurrentLocation = async () => {
    setIsDetectingLocation(true);
    setFormError("");

    try {
      const currentLocation = await requestBrowserLocation();

      setFormData((current) => ({
        ...current,
        pickupLocationName: current.pickupLocationName || "Current location",
        latitude: String(currentLocation.latitude),
        longitude: String(currentLocation.longitude)
      }));
      setFieldErrors((current) => ({
        ...current,
        latitude: "",
        longitude: "",
        pickupLocationName: ""
      }));
    } catch (error) {
      setFormError(
        error?.code === 1
          ? "Location permission was denied. You can still enter latitude and longitude manually."
          : error.message || "Unable to fetch your current location."
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleMapPick = ({ lat, lng }) => {
    setFormData((current) => ({
      ...current,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
    setFieldErrors((current) => ({
      ...current,
      latitude: "",
      longitude: ""
    }));
    setFormError("");
  };

  const handleListingTypeChange = (nextListingType) => {
    setFormData((current) => ({
      ...current,
      listingType: nextListingType,
      securityDeposit: nextListingType === "sell" ? "" : current.securityDeposit,
      depositNote: nextListingType === "sell" ? "" : current.depositNote
    }));
    setFieldErrors((current) => ({
      ...current,
      listingType: "",
      rentalPrice: "",
      salePrice: "",
      securityDeposit: "",
      depositNote: ""
    }));
    setFormError("");
  };

  const handleImagesChange = (nextImages) => {
    setFormData((current) => ({
      ...current,
      images: withAtLeastOneImageField(nextImages)
    }));
    setFieldErrors((current) => ({ ...current, images: "" }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFormError("Please log in again to update this listing.");
      return;
    }

    if (!isOwner) {
      setFormError("You can only edit your own listings.");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    const normalizedImages = normalizeImages(formData.images);

    if (normalizedImages.length === 0) {
      setFieldErrors({ images: "Add at least one image URL before saving." });
      setFormError("At least one image is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      await apiRequest(`/books/${bookId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          isbn: formData.isbn.trim(),
          title: formData.title.trim(),
          author: formData.author.trim(),
          category: formData.category.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          pickupLocationName: formData.pickupLocationName.trim(),
          latitude: formData.latitude.trim() ? Number(formData.latitude) : null,
          longitude: formData.longitude.trim() ? Number(formData.longitude) : null,
          meetupLocation: formData.meetupLocation.trim(),
          depositNote: isRentalListing ? formData.depositNote.trim() : "",
          images: normalizedImages,
          rentalPrice: isRentalListing ? Number(formData.rentalPrice || 0) : 0,
          salePrice: isSaleListing ? Number(formData.salePrice || 0) : null,
          securityDeposit: isRentalListing ? Number(formData.securityDeposit || 0) : 0
        })
      });

      setSuccessMessage("Book updated successfully. Redirecting to the listing...");
      window.setTimeout(() => {
        router.push(`/books/${bookId}`);
      }, 900);
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
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedPage>
      <section className="mx-auto max-w-4xl">
        <ToastViewport
          toasts={[
            successMessage
              ? {
                  id: `edit-book-success-${successMessage}`,
                  tone: "success",
                  title: "Listing updated",
                  message: successMessage,
                  onDismiss: () => setSuccessMessage("")
                }
              : null
          ]}
        />
        <div className="ui-surface p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Edit Book</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Update your book listing
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Review the current details, update pricing or description, and save your changes.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/my-listings" className="ui-btn-secondary w-full px-4 py-2 sm:w-auto">
              Back to my listings
            </Link>
            <Link href={`/books/${bookId}`} className="ui-btn-dark w-full px-4 py-2 sm:w-auto">
              View book details
            </Link>
          </div>

          {isLoadingBook ? (
            <div className="mt-8 h-96 animate-pulse rounded-[1.5rem] bg-slate-100" />
          ) : formError && !book ? (
            <div className="mt-8 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-red-700">
              <h2 className="text-xl font-semibold">Unable to load this listing</h2>
              <p className="mt-2 text-sm leading-6">{formError}</p>
            </div>
          ) : book ? (
            <>
              {!isOwner ? (
                <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-900">
                  <h2 className="text-xl font-semibold">This listing is not yours to edit</h2>
                  <p className="mt-2 text-sm leading-6">
                    The backend only allows owners to save changes for their own books. You can still
                    view the listing details from here.
                  </p>
                </div>
              ) : null}

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <ListingTypeField
                  value={formData.listingType}
                  error={fieldErrors.listingType}
                  onChange={handleListingTypeChange}
                />
                <FormSection title="Basic Info" description="Keep the listing details clear and easy to scan before saving your update.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <InputField label="Title" name="title" value={formData.title} onChange={handleChange} error={fieldErrors.title} placeholder="Clean Code" required />
                    <InputField label="Author" name="author" value={formData.author} onChange={handleChange} error={fieldErrors.author} placeholder="Robert C. Martin" required />
                    <InputField label="ISBN" name="isbn" value={formData.isbn} onChange={handleChange} error={fieldErrors.isbn} placeholder="9780132350884" />
                    <InputField label="Category" name="category" value={formData.category} onChange={handleChange} error={fieldErrors.category} placeholder="Programming" required />
                    <SelectField label="Condition" name="condition" value={formData.condition} onChange={handleChange} error={fieldErrors.condition} options={conditionOptions} />
                    <TextAreaField className="sm:col-span-2" label="Description" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} placeholder="A short description of the book, its condition, and anything readers should know." required />
                  </div>
                </FormSection>

                <FormSection title="Pricing" description="Show rental pricing first, then any sale price if this listing supports both paths.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {isRentalListing ? (
                      <InputField label="Rent per week" name="rentalPrice" type="number" value={formData.rentalPrice} onChange={handleChange} error={fieldErrors.rentalPrice} placeholder="55" required min="0" step="0.01" />
                    ) : null}
                    {isSaleListing ? (
                      <InputField label="Sale price" name="salePrice" type="number" value={formData.salePrice} onChange={handleChange} error={fieldErrors.salePrice} placeholder="250" required min="0" step="0.01" />
                    ) : null}
                    {isRentalListing ? (
                      <InputField label="Security deposit" name="securityDeposit" type="number" value={formData.securityDeposit} onChange={handleChange} error={fieldErrors.securityDeposit} placeholder="220" required min="0" step="0.01" />
                    ) : null}
                    {isRentalListing ? (
                      <InputField label="Deposit note (optional)" name="depositNote" value={formData.depositNote} onChange={handleChange} error={fieldErrors.depositNote} placeholder="e.g. Rs100 refundable deposit" />
                    ) : null}
                  </div>
                </FormSection>

                <FormSection title="Location" description="Make the pickup plan obvious so borrowers know where to meet you.">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <InputField label="City or area" name="location" value={formData.location} onChange={handleChange} error={fieldErrors.location} placeholder="Pune" required />
                    <InputField label="Meetup instructions" name="meetupLocation" value={formData.meetupLocation} onChange={handleChange} error={fieldErrors.meetupLocation} placeholder="e.g. Meet near library gate" />
                  </div>
                  <div className="mt-5 rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Pickup coordinates</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Keep a pickup label plus coordinates so distance can be shown to nearby readers.
                          You can use your current location, click on the map, or enter them manually.
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                        <button
                          type="button"
                          onClick={() => setIsMapPickerOpen((current) => !current)}
                          className="ui-btn-secondary w-full md:w-auto"
                        >
                          {isMapPickerOpen ? "Hide Map Picker" : "Pick on Map"}
                        </button>
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={isDetectingLocation}
                          className="ui-btn-secondary w-full md:w-auto"
                        >
                          {isDetectingLocation ? "Detecting..." : "Use My Current Location"}
                        </button>
                      </div>
                    </div>
                    {isMapPickerOpen ? (
                      <div className="mt-4">
                        <MapCoordinatePicker
                          latitude={formData.latitude}
                          longitude={formData.longitude}
                          onPick={handleMapPick}
                        />
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-5 md:grid-cols-3">
                      <InputField
                        label="Pickup Location Name"
                        name="pickupLocationName"
                        value={formData.pickupLocationName}
                        onChange={handleChange}
                        error={fieldErrors.pickupLocationName}
                        placeholder="Library gate"
                      />
                      <InputField
                        label="Latitude"
                        name="latitude"
                        type="number"
                        value={formData.latitude}
                        onChange={handleChange}
                        error={fieldErrors.latitude}
                        placeholder="18.5204"
                        step="any"
                      />
                      <InputField
                        label="Longitude"
                        name="longitude"
                        type="number"
                        value={formData.longitude}
                        onChange={handleChange}
                        error={fieldErrors.longitude}
                        placeholder="73.8567"
                        step="any"
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Manual latitude and longitude entry still works even if you also use the map picker.
                    </p>
                  </div>
                </FormSection>

                <BookImageUploader
                  images={formData.images}
                  error={fieldErrors.images}
                  token={token}
                  maxImages={MAX_IMAGE_FIELDS}
                  onChange={handleImagesChange}
                />

                <div className="space-y-4">
                  {formError ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isOwner}
                      className="ui-btn-primary w-full sm:w-auto"
                    >
                      {isSubmitting ? "Saving changes..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/my-listings")}
                      className="ui-btn-secondary w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </section>
    </ProtectedPage>
  );
}

function InputField({ className = "", error, label, ...props }) {
  return (
    <label className={`block ${className}`.trim()}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input {...props} className="ui-input" />
      <FieldMessage message={error} />
    </label>
  );
}

function SelectField({ error, label, options, renderOptionLabel = (option) => option, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select {...props} className="ui-select">
        {options.map((option) => (
          <option key={option} value={option}>
            {renderOptionLabel(option)}
          </option>
        ))}
      </select>
      <FieldMessage message={error} />
    </label>
  );
}

function ListingTypeField({ value, error, onChange }) {
  return (
    <div className="rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5 sm:col-span-2">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          Listing Type
        </p>
        <h2 className="text-xl font-semibold text-slate-900">How should people get this book?</h2>
        <p className="text-sm leading-6 text-slate-600">
          Pick one option and the pricing fields below will update automatically.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {listingTypeOptions.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${
                isActive
                  ? "border-teal-600 bg-white shadow-[0_14px_34px_rgba(13,148,136,0.14)]"
                  : "border-white/80 bg-white/80 hover:border-teal-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-slate-900">{option.label}</p>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isActive ? "border-teal-600 bg-teal-600" : "border-slate-300 bg-white"
                  }`}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
            </button>
          );
        })}
      </div>

      <FieldMessage message={error} />
    </div>
  );
}

function TextAreaField({ error, label, ...props }) {
  return (
    <label className={`block ${props.className || ""}`.trim()}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea {...props} rows={5} className="ui-textarea" />
      <FieldMessage message={error} />
    </label>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="ui-subtle-card p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
