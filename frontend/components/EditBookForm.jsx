"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FieldMessage } from "@/components/FieldMessage";
import { ProtectedPage } from "@/components/ProtectedPage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

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
  meetupLocation: "",
  depositNote: "",
  availabilityStatus: "available",
  images: [""]
};

const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];
const availabilityOptions = ["available", "reserved", "rented", "sold"];
const listingTypeOptions = [
  {
    value: "rent",
    label: "Rent",
    description: "Show rental price and security deposit."
  },
  {
    value: "sell",
    label: "Sell",
    description: "Show a sale price only."
  },
  {
    value: "both",
    label: "Both",
    description: "Offer renting and selling in one listing."
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
    meetupLocation: book?.meetupLocation || "",
    depositNote: book?.listingType === "sell" ? "" : book?.depositNote || "",
    availabilityStatus: book?.availabilityStatus || "available",
    images: withAtLeastOneImageField(book?.images || (book?.imageUrl ? [book.imageUrl] : [""]))
  };
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

  const ownerId = book?.owner?.id || book?.owner?._id || "";
  const currentUserId = user?.id || user?._id || "";
  const isOwner = Boolean(ownerId && currentUserId && ownerId === currentUserId);

  const isRentalListing = formData.listingType !== "sell";
  const isSaleListing = formData.listingType !== "rent";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
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

  const handleImageChange = (index, value) => {
    setFormData((current) => ({
      ...current,
      images: withAtLeastOneImageField(current.images).map((image, imageIndex) =>
        imageIndex === index ? value : image
      )
    }));
    setFieldErrors((current) => ({ ...current, images: "" }));
    setFormError("");
  };

  const handleAddImageField = () => {
    setFormData((current) => {
      if (current.images.length >= MAX_IMAGE_FIELDS) {
        return current;
      }

      return {
        ...current,
        images: [...withAtLeastOneImageField(current.images), ""]
      };
    });
    setFieldErrors((current) => ({ ...current, images: "" }));
  };

  const handleRemoveImageField = (index) => {
    setFormData((current) => {
      const nextImages = withAtLeastOneImageField(current.images).filter(
        (_, imageIndex) => imageIndex !== index
      );

      return {
        ...current,
        images: nextImages.length > 0 ? nextImages : [""]
      };
    });
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

  const statusHelpText = useMemo(() => {
    if (formData.availabilityStatus === "available") {
      return "Visible and open for new requests.";
    }

    if (formData.availabilityStatus === "reserved") {
      return "Approved for a renter, but not yet active.";
    }

    if (formData.availabilityStatus === "rented") {
      return "Currently out with a renter.";
    }

    return "Marked as sold and no longer requestable.";
  }, [formData.availabilityStatus]);

  return (
    <ProtectedPage>
      <section className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Edit Book</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Update your book listing
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Review the current details, update pricing or availability, and save your changes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/my-listings"
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Back to my listings
            </Link>
            <Link
              href={`/books/${bookId}`}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
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

              <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
                <ListingTypeField
                  value={formData.listingType}
                  error={fieldErrors.listingType}
                  onChange={handleListingTypeChange}
                />
                <InputField
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={fieldErrors.title}
                  placeholder="Clean Code"
                  required
                />
                <InputField
                  label="Author"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  error={fieldErrors.author}
                  placeholder="Robert C. Martin"
                  required
                />
                <InputField
                  label="ISBN"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleChange}
                  error={fieldErrors.isbn}
                  placeholder="9780132350884"
                />
                <InputField
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  error={fieldErrors.category}
                  placeholder="Programming"
                  required
                />
                <SelectField
                  label="Condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  error={fieldErrors.condition}
                  options={conditionOptions}
                />
                <InputField
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  error={fieldErrors.location}
                  placeholder="Pune"
                  required
                />
                <InputField
                  label="Meetup Instructions"
                  name="meetupLocation"
                  value={formData.meetupLocation}
                  onChange={handleChange}
                  error={fieldErrors.meetupLocation}
                  placeholder="e.g. Meet near library gate"
                />
                <SelectField
                  label="Availability"
                  name="availabilityStatus"
                  value={formData.availabilityStatus}
                  onChange={handleChange}
                  error={fieldErrors.availabilityStatus}
                  options={availabilityOptions}
                  renderOptionLabel={(option) => option.charAt(0).toUpperCase() + option.slice(1)}
                />
                <InfoCard
                  title="Availability guidance"
                  description={statusHelpText}
                  className="sm:col-span-2"
                />
                {isRentalListing ? (
                  <InputField
                    label="Rental Price"
                    name="rentalPrice"
                    type="number"
                    value={formData.rentalPrice}
                    onChange={handleChange}
                    error={fieldErrors.rentalPrice}
                    placeholder="55"
                    required
                    min="0"
                    step="0.01"
                  />
                ) : null}
                {isSaleListing ? (
                  <InputField
                    label="Sale Price"
                    name="salePrice"
                    type="number"
                    value={formData.salePrice}
                    onChange={handleChange}
                    error={fieldErrors.salePrice}
                    placeholder="250"
                    required
                    min="0"
                    step="0.01"
                  />
                ) : null}
                {isRentalListing ? (
                  <InputField
                    label="Security Deposit"
                    name="securityDeposit"
                    type="number"
                    value={formData.securityDeposit}
                    onChange={handleChange}
                    error={fieldErrors.securityDeposit}
                    placeholder="220"
                    required
                    min="0"
                    step="0.01"
                  />
                ) : null}
                {isRentalListing ? (
                  <InputField
                    label="Deposit Note (Optional)"
                    name="depositNote"
                    value={formData.depositNote}
                    onChange={handleChange}
                    error={fieldErrors.depositNote}
                    placeholder="e.g. Rs100 refundable deposit"
                  />
                ) : null}
                <ImageUrlsField
                  images={formData.images}
                  error={fieldErrors.images}
                  onAddImage={handleAddImageField}
                  onChangeImage={handleImageChange}
                  onRemoveImage={handleRemoveImageField}
                />
                <TextAreaField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  error={fieldErrors.description}
                  placeholder="A short description of the book, its condition, and anything readers should know."
                  required
                />

                <div className="space-y-4 sm:col-span-2">
                  {formError ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </p>
                  ) : null}

                  {successMessage ? (
                    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {successMessage}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isOwner}
                      className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isSubmitting ? "Saving changes..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/my-listings")}
                      className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
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

function InfoCard({ className = "", title, description }) {
  return (
    <div className={`rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 ${className}`.trim()}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InputField({ className = "", error, label, ...props }) {
  return (
    <label className={`block ${className}`.trim()}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      <FieldMessage message={error} />
    </label>
  );
}

function SelectField({ error, label, options, renderOptionLabel = (option) => option, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      >
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
    <label className="block sm:col-span-2">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        {...props}
        rows={5}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      <FieldMessage message={error} />
    </label>
  );
}

function ImageUrlsField({ images, error, onAddImage, onChangeImage, onRemoveImage }) {
  const canAddMore = images.length < MAX_IMAGE_FIELDS;

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Book images</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add 1 to 3 image URLs. The first image will be used as the cover image.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddImage}
          disabled={!canAddMore}
          className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          Add image
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {images.map((image, index) => (
          <div
            key={`edit-image-field-${index}`}
            className="rounded-[1.25rem] border border-white/70 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <label className="block flex-1">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {index === 0 ? "Cover image URL" : `Image URL ${index + 1}`}
                </span>
                <input
                  type="url"
                  value={image}
                  onChange={(event) => onChangeImage(index, event.target.value)}
                  placeholder={`https://example.com/book-image-${index + 1}.jpg`}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </label>

              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                disabled={images.length === 1}
                className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <FieldMessage message={error} />
    </div>
  );
}
