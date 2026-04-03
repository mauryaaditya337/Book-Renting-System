"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { BarcodeScannerPanel } from "@/components/BarcodeScannerPanel";
import { FieldMessage } from "@/components/FieldMessage";
import { useAuth } from "@/components/AuthProvider";
import { ToastViewport } from "@/components/ToastViewport";
import { apiRequest } from "@/lib/api";

const MAX_IMAGE_FIELDS = 3;
const ADD_BOOK_DRAFT_KEY = "addBookDraft";
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
  listingType: "rent",
  rentalPrice: "",
  salePrice: "",
  securityDeposit: "",
  location: "",
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

function isEmptyDraftState({ formData, flowStage, isbnLookupValue }) {
  return (
    flowStage === FLOW_STAGES.scan &&
    !isbnLookupValue &&
    formData.title === "" &&
    formData.author === "" &&
    formData.isbn === "" &&
    formData.category === "" &&
    formData.description === "" &&
    formData.condition === initialFormData.condition &&
    formData.listingType === initialFormData.listingType &&
    formData.rentalPrice === "" &&
    formData.salePrice === "" &&
    formData.securityDeposit === "" &&
    formData.location === "" &&
    formData.meetupLocation === "" &&
    formData.depositNote === "" &&
    JSON.stringify(withAtLeastOneImageField(formData.images)) === JSON.stringify(initialFormData.images)
  );
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
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [draftRestoredMessage, setDraftRestoredMessage] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") {
      setHasHydratedDraft(true);
      return;
    }

    try {
      const savedDraft = window.localStorage.getItem(ADD_BOOK_DRAFT_KEY);

      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        const nextFormData = {
          ...initialFormData,
          ...(parsedDraft.formData || {}),
          images: withAtLeastOneImageField(parsedDraft?.formData?.images || initialFormData.images)
        };

        setFormData(nextFormData);
        setIsbnLookupValue(parsedDraft.isbnLookupValue || "");
        setFormSource(
          parsedDraft.formSource === FLOW_STAGES.scan ||
          parsedDraft.formSource === FLOW_STAGES.isbn ||
          parsedDraft.formSource === FLOW_STAGES.manual
            ? parsedDraft.formSource
            : FLOW_STAGES.manual
        );
        setFlowStage(
          parsedDraft.flowStage === FLOW_STAGES.isbn ||
          parsedDraft.flowStage === FLOW_STAGES.manual ||
          parsedDraft.flowStage === FLOW_STAGES.form
            ? parsedDraft.flowStage
            : FLOW_STAGES.form
        );
        setDraftRestoredMessage("Draft restored from your previous visit.");
      }
    } catch (error) {
      window.localStorage.removeItem(ADD_BOOK_DRAFT_KEY);
    } finally {
      setHasHydratedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedDraft || typeof window === "undefined") {
      return;
    }

    const draftState = {
      formData: {
        ...formData,
        images: withAtLeastOneImageField(formData.images)
      },
      flowStage,
      formSource,
      isbnLookupValue
    };

    if (isEmptyDraftState(draftState)) {
      window.localStorage.removeItem(ADD_BOOK_DRAFT_KEY);
      return;
    }

    window.localStorage.setItem(ADD_BOOK_DRAFT_KEY, JSON.stringify(draftState));
  }, [flowStage, formData, formSource, hasHydratedDraft, isbnLookupValue]);

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
        listingType: formData.listingType,
        rentalPrice:
          formData.listingType === "sell" ? 0 : Number(formData.rentalPrice || 0),
        salePrice:
          formData.listingType === "rent" ? undefined : Number(formData.salePrice || 0),
        securityDeposit:
          formData.listingType === "sell" ? 0 : Number(formData.securityDeposit || 0),
        meetupLocation: formData.meetupLocation.trim(),
        depositNote: formData.listingType === "sell" ? "" : formData.depositNote.trim()
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
      setDraftRestoredMessage("");

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ADD_BOOK_DRAFT_KEY);
      }

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
      <section className="add-book-page mx-auto max-w-4xl">
        <ToastViewport
          toasts={[
            successMessage
              ? {
                  id: `add-book-success-${successMessage}`,
                  tone: "success",
                  title: "Listing created",
                  message: successMessage,
                  onDismiss: () => setSuccessMessage("")
                }
              : null,
            draftRestoredMessage
              ? {
                  id: `draft-restored-${draftRestoredMessage}`,
                  tone: "info",
                  title: "Draft restored",
                  message: draftRestoredMessage,
                  onDismiss: () => setDraftRestoredMessage("")
                }
              : null
          ]}
        />
        <div className="ui-surface add-book-shell p-5 md:p-7">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-700">Add Book</p>
          <h1 className="mt-2.5 text-3xl font-semibold text-slate-900 md:mt-3 md:text-[2.55rem]">
            Create a new book listing
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 md:mt-2">
            Start with barcode scanning, then use ISBN lookup or manual entry when needed.
          </p>

          <FlowStageHeader currentStage={flowStage} formSource={formSource} />

          {flowStage !== FLOW_STAGES.form ? (
            <div className="mt-5 space-y-4 md:mt-6 md:space-y-5">
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
                    description="Point your camera at the back barcode. If we detect a valid ISBN, we will fetch the metadata and open the editable listing form."
                  />
                  <BarcodeScannerPanel
                    onDetected={handleDetectedBarcode}
                    onError={setScanError}
                    isLookupInProgress={isFetchingMetadata}
                  />

                  {isFetchingMetadata ? (
                    <p className="ui-feedback-success">
                      Barcode detected. Fetching book details from the ISBN metadata service...
                    </p>
                  ) : null}

                  {scanError ? (
                    <div className="ui-feedback-warning">
                      <p>{scanError}</p>
                      {lastScannedCode ? (
                        <p className="mt-2 text-xs leading-5 text-amber-900">
                          Detected code: <span className="font-semibold">{lastScannedCode}</span>
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-col gap-3 md:flex-row">
                        <button
                          type="button"
                          onClick={handleSwitchToScan}
                          className="ui-btn-warning"
                        >
                          Retry Scan
                        </button>
                        <button
                          type="button"
                          onClick={handleSwitchToIsbn}
                          className="ui-btn-light"
                        >
                          Enter ISBN
                        </button>
                        <button
                          type="button"
                          onClick={handleUseManualEntry}
                          className="ui-btn-light"
                        >
                          Fill Manually
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {scanSuccess ? <p className="ui-feedback-success">{scanSuccess}</p> : null}
                </>
              ) : null}

              {flowStage === FLOW_STAGES.isbn ? (
                <div className="add-book-stage-panel rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-4 md:p-5">
                  <StageCard
                    eyebrow="Step 2"
                    title="Look up by ISBN"
                    description="Enter an ISBN to fetch title, author, cover, and other available metadata before opening the shared editable form."
                  />
                  <div className="mt-4 grid gap-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
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
                      className="ui-btn-primary md:min-w-40"
                    >
                      {isFetchingMetadata ? "Fetching..." : "Fetch Details"}
                    </button>
                  </div>

                  {lookupError ? (
                    <div className="ui-feedback-warning mt-4">
                      <p>{lookupError}</p>
                      <div className="mt-4 flex flex-col gap-3 md:flex-row">
                        <button
                          type="button"
                          onClick={handleFetchDetails}
                          disabled={isFetchingMetadata || !isbnLookupValue.trim()}
                          className="ui-btn-warning"
                        >
                          Retry ISBN Lookup
                        </button>
                        <button
                          type="button"
                          onClick={handleUseManualEntry}
                          className="ui-btn-light"
                        >
                          Use Full Manual Entry
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {lookupSuccess ? <p className="ui-feedback-success mt-4">{lookupSuccess}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {flowStage === FLOW_STAGES.form ? (
            <>
              <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-4 md:mt-7 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                    <button
                      type="button"
                      onClick={handleSwitchToScan}
                      className="ui-btn-light"
                    >
                      Scan Again
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToIsbn}
                      className="ui-btn-light"
                    >
                      Use ISBN
                    </button>
                    {formSource !== FLOW_STAGES.manual ? (
                      <button
                        type="button"
                        onClick={handleUseManualEntry}
                        className="ui-btn-light"
                      >
                        Start Manual Entry
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <form className="mt-6 space-y-5 md:mt-7 md:space-y-5" onSubmit={handleSubmit}>
                <ListingTypeField
                  value={formData.listingType}
                  error={fieldErrors.listingType}
                  onChange={handleListingTypeChange}
                />
                <FormSection
                  title="Basic Info"
                  description="Share the title, author, condition, and a short description so the listing feels complete and easy to scan."
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <InputField label="Title" name="title" value={formData.title} onChange={handleChange} error={fieldErrors.title} placeholder="Clean Code" required />
                    <InputField label="Author" name="author" value={formData.author} onChange={handleChange} error={fieldErrors.author} placeholder="Robert C. Martin" required />
                    <InputField label="ISBN" name="isbn" value={formData.isbn} onChange={handleChange} error={fieldErrors.isbn} placeholder="9780132350884" />
                    <InputField label="Category" name="category" value={formData.category} onChange={handleChange} error={fieldErrors.category} placeholder="Programming" required />
                    <SelectField label="Condition" name="condition" value={formData.condition} onChange={handleChange} error={fieldErrors.condition} options={conditionOptions} />
                    <TextAreaField className="md:col-span-2" label="Description" name="description" value={formData.description} onChange={handleChange} error={fieldErrors.description} placeholder="A short description of the book, its condition, and anything renters should know." required />
                  </div>
                </FormSection>

                <FormSection
                  title="Pricing"
                  description="Keep the pricing simple and readable. Rental listings show weekly pricing first."
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    {formData.listingType !== "sell" ? (
                      <InputField label="Rent per week" name="rentalPrice" type="number" value={formData.rentalPrice} onChange={handleChange} error={fieldErrors.rentalPrice} placeholder="55" required min="0" step="0.01" />
                    ) : null}
                    {formData.listingType !== "rent" ? (
                      <InputField label="Sale price" name="salePrice" type="number" value={formData.salePrice} onChange={handleChange} error={fieldErrors.salePrice} placeholder="250" required min="0" step="0.01" />
                    ) : null}
                    {formData.listingType !== "sell" ? (
                      <InputField label="Security deposit" name="securityDeposit" type="number" value={formData.securityDeposit} onChange={handleChange} error={fieldErrors.securityDeposit} placeholder="220" required min="0" step="0.01" />
                    ) : null}
                    {formData.listingType !== "sell" ? (
                      <InputField label="Deposit note (optional)" name="depositNote" value={formData.depositNote} onChange={handleChange} error={fieldErrors.depositNote} placeholder="e.g. Rs100 refundable deposit" />
                    ) : null}
                  </div>
                </FormSection>

                <FormSection
                  title="Location"
                  description="Set a clear place and meetup note so pickups feel straightforward."
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <InputField label="City or area" name="location" value={formData.location} onChange={handleChange} error={fieldErrors.location} placeholder="Pune" required />
                    <InputField label="Meetup instructions" name="meetupLocation" value={formData.meetupLocation} onChange={handleChange} error={fieldErrors.meetupLocation} placeholder="e.g. Meet near library gate" />
                  </div>
                </FormSection>

                <ImageUrlsField
                  images={formData.images}
                  error={fieldErrors.images}
                  onAddImage={handleAddImageField}
                  onChangeImage={handleImageChange}
                  onRemoveImage={handleRemoveImageField}
                />

                <div className="space-y-4">
                  {formError ? (
                    <p className="ui-feedback-error">
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 md:flex-row">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="ui-btn-primary w-full md:w-auto"
                    >
                      {isSubmitting ? "Creating listing..." : "Create listing"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/my-listings")}
                      className="ui-btn-secondary w-full md:w-auto"
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
    <div className="add-book-progress mt-5 grid gap-2 md:mt-6 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`rounded-[1.35rem] border px-3.5 py-3 transition ${
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
    <div className="add-book-mode-switcher rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-3.5 md:p-4">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-slate-900">Choose how you want to start</p>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700">
          Scanner stays default
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        Pick a starting method below. Each option leads into the same editable form.
      </p>
      <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
        {buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={button.onClick}
            className={`add-book-mode-button rounded-[1.25rem] px-4 py-3 text-left text-sm font-medium transition ${
              currentStage === button.id
                ? "border-teal-600 bg-teal-700 text-white shadow-[0_14px_32px_rgba(15,118,110,0.2)]"
                : "border-white/80 bg-white text-slate-700 hover:bg-slate-100"
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
    <div className="add-book-stage-card rounded-[1.4rem] border border-sky-100 bg-sky-50/70 p-4 md:p-5">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-sky-700">{eyebrow}</p>
      <h2 className="mt-1.5 text-lg font-semibold text-slate-900 md:text-xl">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">{description}</p>
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
    <div className="md:col-span-2 rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5 md:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
          Listing Type
        </p>
        <h2 className="text-xl font-semibold text-slate-900">How should people get this book?</h2>
        <p className="text-sm leading-6 text-slate-600">
          Pick one option and the pricing fields below will update automatically.
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
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

      <div className="mt-3.5 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
        {value === "rent"
          ? "Rent listings ask for rental price and security deposit."
          : value === "sell"
            ? "Sell listings ask only for the sale price."
            : "Both listings ask for rental price, security deposit, and sale price."}
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

function ImageUrlsField({
  images,
  error,
  onAddImage,
  onChangeImage,
  onRemoveImage
}) {
  const canAddMore = images.length < MAX_IMAGE_FIELDS;

  return (
    <div className="md:col-span-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          className="ui-btn-light px-4 py-2"
        >
          Add image
        </button>
      </div>

      <div className="mt-4 space-y-3.5">
        {images.map((image, index) => (
          <div
            key={`image-field-${index}`}
            className="rounded-[1.25rem] border border-white/70 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <label className="block flex-1">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {index === 0 ? "Cover image URL" : `Image URL ${index + 1}`}
                </span>
                <input
                  type="url"
                  value={image}
                  onChange={(event) => onChangeImage(index, event.target.value)}
                  placeholder={`https://example.com/book-image-${index + 1}.jpg`}
                  className="ui-input"
                />
              </label>

              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                disabled={images.length === 1}
                className="ui-btn-danger px-4 py-3"
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

function FormSection({ title, description, children }) {
  return (
    <section className="ui-subtle-card p-5 md:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
