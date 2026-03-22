const MIN_BOOK_IMAGES = 1;
const MAX_BOOK_IMAGES = 3;

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const sanitizeImageUrl = (value) => {
  if (!isNonEmptyString(value)) {
    return "";
  }

  return value.trim();
};

const isValidAbsoluteUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
};

const normalizeBookImages = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeImageUrl(item))
    .filter(Boolean);
};

const getImagesFromPayload = (payload = {}) => {
  if (Object.prototype.hasOwnProperty.call(payload, "images")) {
    return normalizeBookImages(payload.images);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "imageUrl")) {
    const imageUrl = sanitizeImageUrl(payload.imageUrl);
    return imageUrl ? [imageUrl] : [];
  }

  return null;
};

const validateImages = (images, { required = false } = {}) => {
  if (!Array.isArray(images)) {
    if (required) {
      throw new Error(`At least ${MIN_BOOK_IMAGES} image is required`);
    }

    return;
  }

  if (images.length < MIN_BOOK_IMAGES) {
    throw new Error(`At least ${MIN_BOOK_IMAGES} image is required`);
  }

  if (images.length > MAX_BOOK_IMAGES) {
    throw new Error(`No more than ${MAX_BOOK_IMAGES} images are allowed`);
  }

  images.forEach((image, index) => {
    if (!isNonEmptyString(image)) {
      throw new Error(`Image at position ${index + 1} must be a non-empty string`);
    }

    if (!isValidAbsoluteUrl(image.trim())) {
      throw new Error(`Image at position ${index + 1} must be a valid absolute URL`);
    }
  });
};

const getCoverImage = (book = {}) => {
  const normalizedImages = normalizeBookImages(book.images);

  if (normalizedImages.length > 0) {
    return normalizedImages[0];
  }

  return sanitizeImageUrl(book.imageUrl);
};

const getResponseImages = (book = {}) => {
  const normalizedImages = normalizeBookImages(book.images);

  if (normalizedImages.length > 0) {
    return normalizedImages;
  }

  const coverImage = sanitizeImageUrl(book.imageUrl);
  return coverImage ? [coverImage] : [];
};

module.exports = {
  MIN_BOOK_IMAGES,
  MAX_BOOK_IMAGES,
  getCoverImage,
  getImagesFromPayload,
  getResponseImages,
  isValidAbsoluteUrl,
  normalizeBookImages,
  sanitizeImageUrl,
  validateImages
};
