"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { BarcodeScannerPanel } from "@/components/BarcodeScannerPanel";
import { FieldMessage } from "@/components/FieldMessage";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

const MAX_IMAGE_FIELDS = 3;
const FLOW_STAGES = {
  scan: "scan",
  isbn: "isbn",
  manual: "manual",
  form: "form"
};

const initialFormData = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  description: "",
  condition: "Good",
  rentalPrice: "",
  securityDeposit: "",
  location: "",
  images: [""]
};

const conditionOptions = ["New", "Like New", "Good", "Fair", "Poor"];

function normalizeIsbnCharacters(value = "") {
  return String(value).replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  const checksum = isbn.split("").reduce((sum, character, index) => {
    const digit = character === "X" ? 10 : Number(character);
    return sum + digit * (10 - index);
  }, 0);

  return checksum % 11 === 0;
}

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  const checksum = isbn.split("").reduce((sum, character, index) => {
    const digit = Number(character);
    return sum + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return checksum % 10 === 0;
}

function getNormalizedIsbnCandidate(rawValue = "") {
  const normalized = normalizeIsbnCharacters(rawValue);
  const candidates = [normalized];

  if (normalized.length > 13 && /^\d+$/.test(normalized)) {
    candidates.push(normalized.slice(0, 13));
  }

  if (normalized.length > 10) {
    candidates.push(normalized.slice(0, 10));
  }

  for (const candidate of candidates) {
    if (candidate.length === 13 && isValidIsbn13(candidate)) {
      return candidate;
    }

    if (candidate.length === 10 && isValidIsbn10(candidate)) {
      return candidate;
    }
  }

  return normalized;
}

function normalizeImages(images = []) {
  return images.map((image) => image.trim()).filter(Boolean);
}

function withAtLeastOneImageField(images = []) {
  if (!Array.isArray(images) || images.length === 0) {
    return [""];
  }

  return images.slice(0, MAX_IMAGE_FIELDS);
}

function mergeAutofillCoverImage(images = [], coverImage = "") {
  const nextImages = withAtLeastOneImageField(images);

  if (!coverImage) {
    return nextImages;
  }

  const mergedImages = [...nextImages];
  mergedImages[0] = coverImage;
  return mergedImages.slice(0, MAX_IMAGE_FIELDS);
}

export function AddBookForm() {
  const router = useRouter();
  const { token } = useAuth();

  const [flowStage, setFlowStage] = useState(FLOW_STAGES.scan);
  const [formSource, setFormSource] = useState(FLOW_STAGES.manual);
  const [formData, setFormData] = useState(initialFormData);
  const [isbnLookupValue, setIsbnLookupValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupSuccess, setLookupSuccess] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");

  const resetLookupMessages = () => {
    setLookupError("");
    setLookupSuccess("");
    setScanError("");
    setScanSuccess("");
  };

  const openEditableForm = (source) => {
    setFlowStage(FLOW_STAGES.form);
    setFormSource(source);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  };

  const handleImageChange = (index, value) => {
    setFormData((current) => {
      const nextImages = withAtLeastOneImageField(current.images).map((image, imageIndex) =>
        imageIndex === index ? value : image
      );

      return {
        ...current,
        images: nextImages
      };
    });
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

  const handleSwitchToScan = () => {
    setFlowStage(FLOW_STAGES.scan);
    resetLookupMessages();
    setFormError("");
  };

  const handleSwitchToIsbn = () => {
    setFlowStage(FLOW_STAGES.isbn);
    setFormError("");
    setLookupError("");
    setLookupSuccess("");
    setScanError("");
    setScanSuccess("");
  };

  const handleUseManualEntry = () => {
    setFormData(initialFormData);
    openEditableForm(FLOW_STAGES.manual);
    setFormError("");
    setFieldErrors({});
    resetLookupMessages();
  };

  useEffect(() => {
    if (flowStage !== FLOW_STAGES.scan) {
      setScanError("");
      setScanSuccess("");
    }
  }, [flowStage]);

  const lookupBookMetadata = async (rawIsbn, source) => {
    const rawValue = String(rawIsbn ?? "").trim();
    const normalizedIsbn = getNormalizedIsbnCandidate(rawValue);

    if (source === "scan") {
      setLastScannedCode(rawValue);
    }

    if (!normalizedIsbn) {
      const nextMessage =
        source === "scan"
          ? "We detected a barcode, but it did not contain a usable ISBN."
          : "Enter a valid ISBN-10 or ISBN-13 to fetch book details.";

      if (source === "scan") {
        setScanError(`${nextMessage} You can retry scanning or continue with Manual or ISBN Lookup.`);
      } else {
        setLookupError(nextMessage);
      }

      return;
    }

    setLookupError("");
    setLookupSuccess("");
    setScanError("");
    setScanSuccess("");
    setFormError("");
    setFieldErrors((current) => ({ ...current, isbn: "" }));
    setIsFetchingMetadata(true);

    try {
      const data = await apiRequest(`/book-metadata/isbn/${encodeURIComponent(normalizedIsbn)}`);
      const metadata = data.metadata || {};

      setFormData((current) => ({
        ...current,
        title: metadata.title || current.title,
        author: metadata.author || current.author,
        isbn: metadata.isbn || normalizedIsbn || current.isbn,
        category: metadata.category || current.category,
        description: metadata.description || current.description,
        images: mergeAutofillCoverImage(current.images, metadata.imageUrl || "")
      }));
      setIsbnLookupValue(metadata.isbn || normalizedIsbn);
      openEditableForm(source === "scan" ? FLOW_STAGES.scan : FLOW_STAGES.isbn);

      if (source === "scan") {
        setScanSuccess("Barcode scanned successfully. Book details were autofilled below.");
      } else {
        setLookupSuccess("Details fetched. You can review and edit the fields before publishing.");
      }
    } catch (error) {
      const nextMessage = error.message || "Unable to fetch book metadata right now.";

      if (source === "scan") {
        setScanError(`${nextMessage} You can retry scanning or continue with Manual or ISBN Lookup.`);
      } else {
        setLookupError(nextMessage);
      }

      setFormData((current) => ({
        ...current,
        isbn: normalizedIsbn || current.isbn
      }));

      setIsbnLookupValue(normalizedIsbn || rawValue);

      if (source === "isbn") {
        setFlowStage(FLOW_STAGES.isbn);
      }
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleFetchDetails = async () => {
    await lookupBookMetadata(isbnLookupValue, "isbn");
  };

  const handleDetectedBarcode = async (scannedValue) => {
    const rawValue = String(scannedValue ?? "");
    const normalizedValue = getNormalizedIsbnCandidate(rawValue);

    setLastScannedCode(rawValue);
    setIsbnLookupValue(normalizedValue || rawValue);
    await lookupBookMetadata(scannedValue, "scan");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFormError("Please log in to add a book listing.");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    const normalizedImages = normalizeImages(formData.images);

    if (normalizedImages.length === 0) {
      setFieldErrors({ images: "Add at least one image URL before submitting." });
      setFormError("At least one image is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        isbn: formData.isbn.trim(),
        images: normalizedImages,
        rentalPrice: Number(formData.rentalPrice),
        securityDeposit: Number(formData.securityDeposit)
      };

      const data = await apiRequest("/books", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      setSuccessMessage("Book listing created successfully. Redirecting to your listings...");
      setFormData(initialFormData);
      setIsbnLookupValue("");
      setLookupError("");
      setLookupSuccess("");
      setScanError("");
      setScanSuccess("");
      setFlowStage(FLOW_STAGES.scan);
      setFormSource(FLOW_STAGES.manual);

      window.setTimeout(() => {
        router.push("/my-listings");
      }, 900);

      return data;
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
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Add Book</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Create a new book listing
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Begin with barcode scanning by default, then fall back to ISBN lookup or full manual
            entry when needed. Every path leads into the same editable book form.
          </p>

          <FlowStageHeader currentStage={flowStage} formSource={formSource} />

          {flowStage !== FLOW_STAGES.form ? (
            <div className="mt-8 space-y-6">
              <StageSwitcher
                currentStage={flowStage}
                onSelectIsbn={handleSwitchToIsbn}
                onSelectManual={handleUseManualEntry}
                onSelectScan={handleSwitchToScan}
              />

              {flowStage === FLOW_STAGES.scan ? (
                <>
                  <StageCard
                    eyebrow="Step 1"
                    title="Scan the barcode"
                    description="Point your camera at the back barcode. If we detect a valid ISBN, we will fetch the metadata and move you into the editable listing form."
                  />
                  <BarcodeScannerPanel
                    onDetected={handleDetectedBarcode}
                    onError={setScanError}
                    isLookupInProgress={isFetchingMetadata}
                  />

                  {isFetchingMetadata ? (
                    <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      Barcode detected. Fetching book details from the ISBN metadata service...
                    </p>
                  ) : null}

                  {scanError ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      <p>{scanError}</p>
                      {lastScannedCode ? (
                        <p className="mt-2 text-xs leading-5 text-amber-900">
                          Detected code: <span className="font-semibold">{lastScannedCode}</span>
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleSwitchToScan}
                          className="rounded-2xl bg-amber-600 px-4 py-2 font-medium text-white transition hover:bg-amber-700"
                        >
                          Retry Scan
                        </button>
                        <button
                          type="button"
                          onClick={handleSwitchToIsbn}
                          className="rounded-2xl bg-white px-4 py-2 font-medium text-amber-900 transition hover:bg-amber-100"
                        >
                          Enter ISBN
                        </button>
                        <button
                          type="button"
                          onClick={handleUseManualEntry}
                          className="rounded-2xl bg-white px-4 py-2 font-medium text-amber-900 transition hover:bg-amber-100"
                        >
                          Fill Manually
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {scanSuccess ? (
                    <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {scanSuccess}
                    </p>
                  ) : null}
                </>
              ) : null}

              {flowStage === FLOW_STAGES.isbn ? (
                <div className="rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5">
                  <StageCard
                    eyebrow="Step 2"
                    title="Look up by ISBN"
                    description="Enter an ISBN to fetch title, author, cover, and any other available metadata before opening the shared editable form."
                  />
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <InputField
                      label="Enter ISBN"
                      name="isbnLookup"
                      value={isbnLookupValue}
                      onChange={(event) => {
                        setIsbnLookupValue(event.target.value);
                        setLookupError("");
                        setLookupSuccess("");
                      }}
                      placeholder="9780132350884"
                    />
                    <button
                      type="button"
                      onClick={handleFetchDetails}
                      disabled={isFetchingMetadata || !isbnLookupValue.trim()}
                      className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isFetchingMetadata ? "Fetching..." : "Fetch Details"}
                    </button>
                  </div>

                  {lookupError ? (
                    <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      <p>{lookupError}</p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handleFetchDetails}
                          disabled={isFetchingMetadata || !isbnLookupValue.trim()}
                          className="rounded-2xl bg-amber-600 px-4 py-2 font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          Retry ISBN Lookup
                        </button>
                        <button
                          type="button"
                          onClick={handleUseManualEntry}
                          className="rounded-2xl bg-white px-4 py-2 font-medium text-amber-900 transition hover:bg-amber-100"
                        >
                          Use Full Manual Entry
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {lookupSuccess ? (
                    <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {lookupSuccess}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {flowStage === FLOW_STAGES.form ? (
            <>
              <div className="mt-8 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      {formSource === FLOW_STAGES.manual
                        ? "Manual entry form is ready"
                        : "Editable autofill form is ready"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      {formSource === FLOW_STAGES.manual
                        ? "Add the book details from scratch, including at least one image URL."
                        : "Review the autofilled details, fix anything missing, and adjust the images before creating the listing."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSwitchToScan}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                    >
                      Scan Again
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToIsbn}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                    >
                      Use ISBN
                    </button>
                    {formSource !== FLOW_STAGES.manual ? (
                      <button
                        type="button"
                        onClick={handleUseManualEntry}
                        className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                      >
                        Start Manual Entry
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
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
                  placeholder="A short description of the book, its condition, and anything renters should know."
                  required
                />

                <div className="sm:col-span-2 space-y-4">
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
                      disabled={isSubmitting}
                      className="rounded-2xl bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isSubmitting ? "Creating listing..." : "Create listing"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/my-listings")}
                      className="rounded-2xl bg-slate-100 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-200"
                    >
                      View my listings
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

function FlowStageHeader({ currentStage, formSource }) {
  const steps = [
    {
      id: FLOW_STAGES.scan,
      label: "Scan Barcode",
      isActive: currentStage === FLOW_STAGES.scan
    },
    {
      id: FLOW_STAGES.isbn,
      label: "Enter ISBN",
      isActive: currentStage === FLOW_STAGES.isbn
    },
    {
      id: FLOW_STAGES.manual,
      label: "Manual Entry",
      isActive: currentStage === FLOW_STAGES.manual || (currentStage === FLOW_STAGES.form && formSource === FLOW_STAGES.manual)
    },
    {
      id: FLOW_STAGES.form,
      label: "Edit Listing",
      isActive: currentStage === FLOW_STAGES.form
    }
  ];

  return (
    <div className="mt-8 grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`rounded-[1.5rem] border px-4 py-4 transition ${
            step.isActive
              ? "border-teal-600 bg-teal-50 shadow-[0_12px_30px_rgba(13,148,136,0.12)]"
              : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
            Step {index + 1}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function StageSwitcher({
  currentStage,
  onSelectIsbn,
  onSelectManual,
  onSelectScan
}) {
  const buttons = [
    {
      id: FLOW_STAGES.scan,
      label: "Scan Barcode",
      onClick: onSelectScan
    },
    {
      id: FLOW_STAGES.isbn,
      label: "Enter ISBN",
      onClick: onSelectIsbn
    },
    {
      id: FLOW_STAGES.manual,
      label: "Fill Manually",
      onClick: onSelectManual
    }
  ];

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
      <p className="text-sm font-semibold text-slate-900">Choose how you want to start</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Scanning is the fastest path, ISBN lookup is the fallback, and manual entry is always
        available when metadata is incomplete.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={button.onClick}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              currentStage === button.id
                ? "bg-teal-700 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StageCard({ eyebrow, title, description }) {
  return (
    <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-sky-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InputField({
  className = "",
  error,
  label,
  ...props
}) {
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

function SelectField({ error, label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldMessage message={error} />
    </label>
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

function ImageUrlsField({
  images,
  error,
  onAddImage,
  onChangeImage,
  onRemoveImage
}) {
  const canAddMore = images.length < MAX_IMAGE_FIELDS;

  return (
    <div className="sm:col-span-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
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
            key={`image-field-${index}`}
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
