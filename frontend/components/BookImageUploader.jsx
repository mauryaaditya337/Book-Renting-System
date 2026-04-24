"use client";

import { useId, useState } from "react";

import { FieldMessage } from "@/components/FieldMessage";
import { uploadBookImage } from "@/lib/bookImageUpload";

function normalizeImages(images = [], maxImages = 3) {
  if (!Array.isArray(images) || images.length === 0) {
    return [""];
  }

  return images.slice(0, maxImages);
}

function getDisplayImages(images, maxImages) {
  return normalizeImages(images, maxImages);
}

function getFirstEmptyIndex(images) {
  return images.findIndex((image) => !String(image || "").trim());
}

function buildNextImages(images, maxImages, targetIndex) {
  const nextImages = [...normalizeImages(images, maxImages)];

  while (nextImages.length <= targetIndex && nextImages.length < maxImages) {
    nextImages.push("");
  }

  return nextImages;
}

function formatFileSize(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

export function BookImageUploader({
  images,
  error,
  token,
  maxImages = 3,
  onChange
}) {
  const chooseInputId = useId();
  const cameraInputId = useId();
  const displayImages = getDisplayImages(images, maxImages);
  const canAddMore = displayImages.length < maxImages;

  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadingIndexes, setUploadingIndexes] = useState({});

  const updateImages = (nextImages) => {
    onChange(normalizeImages(nextImages, maxImages));
    setUploadError("");
  };

  const setUploadProgress = (index, progress) => {
    setUploadingIndexes((current) => ({
      ...current,
      [index]: progress
    }));
  };

  const clearUploadProgress = (index) => {
    setUploadingIndexes((current) => {
      const nextState = { ...current };
      delete nextState[index];
      return nextState;
    });
  };

  const uploadFileAtIndex = async (file, targetIndex, sourceImages) => {
    try {
      setUploadProgress(targetIndex, 0);
      const response = await uploadBookImage({
        file,
        token,
        onProgress: (progress) => setUploadProgress(targetIndex, progress)
      });

      const nextImages = buildNextImages(sourceImages, maxImages, targetIndex);
      nextImages[targetIndex] = response.imageUrl;
      updateImages(nextImages);
      return nextImages;
    } catch (nextError) {
      setUploadError(nextError.message);
      return sourceImages;
    } finally {
      clearUploadProgress(targetIndex);
    }
  };

  const uploadFiles = async (fileList, preferredIndex = null) => {
    const files = Array.from(fileList || []).filter(Boolean);

    if (files.length === 0) {
      return;
    }

    const startingImages = getDisplayImages(images, maxImages);
    let nextAutoIndex = preferredIndex ?? getFirstEmptyIndex(startingImages);

    for (const file of files) {
      if (preferredIndex != null) {
        await uploadFileAtIndex(file, preferredIndex, startingImages);
        break;
      }

      if (nextAutoIndex === -1) {
        if (startingImages.length >= maxImages) {
          setUploadError(`You can upload up to ${maxImages} images per listing.`);
          break;
        }

        nextAutoIndex = startingImages.length;
      }

      const nextImages = await uploadFileAtIndex(file, nextAutoIndex, startingImages);
      startingImages.splice(0, startingImages.length, ...nextImages);
      nextAutoIndex = getFirstEmptyIndex(startingImages);
    }
  };

  const handleManualUrlChange = (index, value) => {
    const nextImages = buildNextImages(displayImages, maxImages, index);
    nextImages[index] = value;
    updateImages(nextImages);
  };

  const handleAddField = () => {
    if (!canAddMore) {
      return;
    }

    updateImages([...displayImages, ""]);
  };

  const handleRemoveImage = (index) => {
    const nextImages = displayImages.filter((_, imageIndex) => imageIndex !== index);
    updateImages(nextImages.length > 0 ? nextImages : [""]);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    await uploadFiles(event.dataTransfer.files);
  };

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Book images</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Upload from gallery, camera, or desktop files. The first image stays the cover, and manual URL entry still works if you need it.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddField}
          disabled={!canAddMore}
          className="ui-btn-light px-4 py-2"
        >
          Add image slot
        </button>
      </div>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={`mt-4 rounded-[1.35rem] border border-dashed p-4 transition md:p-5 ${
          dragActive
            ? "border-teal-500 bg-teal-50"
            : "border-slate-300 bg-white/80"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Upload directly to Cloudinary</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Drag images here on desktop, choose from files, or open the camera on supported mobile devices.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={chooseInputId} className="ui-btn-secondary cursor-pointer px-4 py-2 text-center">
              Choose files
            </label>
            <label htmlFor={cameraInputId} className="ui-btn-secondary cursor-pointer px-4 py-2 text-center">
              Use camera
            </label>
          </div>
        </div>

        <input
          id={chooseInputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (event) => {
            await uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async (event) => {
            await uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mt-5 space-y-4">
        {displayImages.map((image, index) => {
          const isUploading = typeof uploadingIndexes[index] === "number";
          const progress = uploadingIndexes[index] || 0;
          const previewUrl = String(image || "").trim();

          return (
            <div
              key={`book-image-slot-${index}`}
              className="rounded-[1.25rem] border border-white/70 bg-white p-4 shadow-sm"
            >
              <div className="grid gap-4 lg:grid-cols-[9rem_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[1.1rem] border border-slate-200 bg-slate-100">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={`Book upload preview ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center px-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Empty slot
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {index === 0 ? "Cover image" : `Image ${index + 1}`}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Upload a fresh image or paste a direct image URL manually.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label
                        htmlFor={`${chooseInputId}-replace-${index}`}
                        className="ui-btn-light cursor-pointer px-4 py-2 text-center"
                      >
                        {previewUrl ? "Replace" : "Upload"}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={displayImages.length === 1}
                        className="ui-btn-danger px-4 py-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <input
                    id={`${chooseInputId}-replace-${index}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      await uploadFiles(event.target.files, index);
                      event.target.value = "";
                    }}
                  />

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      {index === 0 ? "Cover image URL" : `Image URL ${index + 1}`}
                    </span>
                    <input
                      type="url"
                      value={image}
                      onChange={(event) => handleManualUrlChange(index, event.target.value)}
                      placeholder={`https://example.com/book-image-${index + 1}.jpg`}
                      className="ui-input"
                    />
                  </label>

                  {isUploading ? (
                    <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm text-teal-900">
                        <span>Uploading image...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-100">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-[width]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : previewUrl ? (
                    <p className="text-xs text-slate-500">
                      Live preview ready.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      JPG, PNG, WEBP, and other image formats up to {formatFileSize(5 * 1024 * 1024)}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FieldMessage message={error || uploadError} />
    </div>
  );
}
