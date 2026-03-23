const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_API_URL = "https://openlibrary.org/api/books";
const OPEN_LIBRARY_COVERS_API_URL = "https://covers.openlibrary.org/b/isbn";
const LOOKUP_TIMEOUT_MS = 5000;
const METADATA_CACHE_TTL_MS = 15 * 60 * 1000;
const metadataCache = new Map();

const normalizeIsbn = (value = "") => value.replace(/[^0-9Xx]/g, "").toUpperCase();

const isValidIsbn10 = (isbn) => {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  const checksum = isbn.split("").reduce((sum, character, index) => {
    const digit = character === "X" ? 10 : Number(character);
    return sum + digit * (10 - index);
  }, 0);

  return checksum % 11 === 0;
};

const isValidIsbn13 = (isbn) => {
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  const checksum = isbn.split("").reduce((sum, character, index) => {
    const digit = Number(character);
    return sum + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return checksum % 10 === 0;
};

const validateAndNormalizeIsbn = (rawIsbn = "") => {
  const isbn = normalizeIsbn(rawIsbn);

  if (isbn.length === 10 && isValidIsbn10(isbn)) {
    return isbn;
  }

  if (isbn.length === 13 && isValidIsbn13(isbn)) {
    return isbn;
  }

  const error = new Error("ISBN must be a valid ISBN-10 or ISBN-13");
  error.statusCode = 400;
  throw error;
};

const pickFirst = (items) => {
  if (Array.isArray(items) && items.length > 0) {
    return items[0];
  }

  return "";
};

const normalizeBookMetadata = ({
  title = "",
  author = "",
  isbn = "",
  category = "",
  description = "",
  imageUrl = "",
  publisher = "",
  publishedDate = ""
}) => ({
  title,
  author,
  isbn,
  category,
  description,
  imageUrl,
  publisher,
  publishedDate
});

const hasUsefulMetadata = (metadata) =>
  Boolean(
    metadata &&
      (metadata.title ||
        metadata.author ||
        metadata.description ||
        metadata.category ||
        metadata.imageUrl ||
        metadata.publisher ||
        metadata.publishedDate)
  );

const buildOpenLibraryCoverUrl = (isbn) =>
  `${OPEN_LIBRARY_COVERS_API_URL}/${encodeURIComponent(isbn)}-L.jpg`;

const getCachedMetadata = (isbn) => {
  const cachedEntry = metadataCache.get(isbn);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    metadataCache.delete(isbn);
    return null;
  }

  return cachedEntry.metadata;
};

const setCachedMetadata = (isbn, metadata) => {
  metadataCache.set(isbn, {
    metadata,
    expiresAt: Date.now() + METADATA_CACHE_TTL_MS
  });
};

const createLookupError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const fetchJsonWithTimeout = async (url, sourceName) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      if (response.status === 429) {
        throw createLookupError(`${sourceName} is temporarily rate limited`, "RATE_LIMITED");
      }

      throw createLookupError(`${sourceName} request failed with status ${response.status}`, "HTTP_ERROR");
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createLookupError(`${sourceName} request timed out`, "TIMEOUT");
    }

    if (error?.code) {
      throw error;
    }

    throw createLookupError(`${sourceName} request could not be completed`, "NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
};

const mergeMetadata = (isbn, googleMetadata, openLibraryMetadata) =>
  normalizeBookMetadata({
    title: googleMetadata?.title || openLibraryMetadata?.title || "",
    author: googleMetadata?.author || openLibraryMetadata?.author || "",
    isbn,
    category: googleMetadata?.category || openLibraryMetadata?.category || "",
    description: googleMetadata?.description || openLibraryMetadata?.description || "",
    imageUrl:
      googleMetadata?.imageUrl ||
      openLibraryMetadata?.imageUrl ||
      buildOpenLibraryCoverUrl(isbn),
    publisher: googleMetadata?.publisher || openLibraryMetadata?.publisher || "",
    publishedDate: googleMetadata?.publishedDate || openLibraryMetadata?.publishedDate || ""
  });

const lookupWithGoogleBooks = async (isbn) => {
  const payload = await fetchJsonWithTimeout(
    `${GOOGLE_BOOKS_API_URL}?q=isbn:${encodeURIComponent(isbn)}`,
    "Google Books"
  );
  const volume = pickFirst(payload.items);
  const info = volume?.volumeInfo;

  if (!info) {
    return null;
  }

  return normalizeBookMetadata({
    title: info.title || "",
    author: Array.isArray(info.authors) ? info.authors.join(", ") : "",
    isbn,
    category: pickFirst(info.categories),
    description: info.description || "",
    imageUrl: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "",
    publisher: info.publisher || "",
    publishedDate: info.publishedDate || ""
  });
};

const lookupWithOpenLibrary = async (isbn) => {
  const url =
    `${OPEN_LIBRARY_API_URL}?bibkeys=ISBN:${encodeURIComponent(isbn)}` +
    "&format=json&jscmd=details";
  const payload = await fetchJsonWithTimeout(url, "Open Library");
  const book = payload[`ISBN:${isbn}`];
  const details = book?.details;

  if (!details) {
    return null;
  }

  return normalizeBookMetadata({
    title: details.title || "",
    author: Array.isArray(details.authors)
      ? details.authors.map((item) => item?.name).filter(Boolean).join(", ")
      : "",
    isbn,
    category: Array.isArray(details.subjects)
      ? details.subjects
          .map((item) => (typeof item === "string" ? item : item?.name))
          .filter(Boolean)[0] || ""
      : "",
    description:
      typeof details.description === "string"
        ? details.description
        : details.description?.value || "",
    imageUrl:
      book?.thumbnail_url ||
      (details.covers?.length ? `https://covers.openlibrary.org/b/id/${details.covers[0]}-L.jpg` : ""),
    publisher: Array.isArray(details.publishers)
      ? details.publishers
          .map((item) => (typeof item === "string" ? item : item?.name))
          .filter(Boolean)
          .join(", ")
      : "",
    publishedDate: details.publish_date || ""
  });
};

const getBookMetadataByIsbn = async (rawIsbn) => {
  const isbn = validateAndNormalizeIsbn(rawIsbn);
  const cachedMetadata = getCachedMetadata(isbn);

  if (cachedMetadata) {
    return cachedMetadata;
  }

  const lookupErrors = [];

  let googleMetadata = null;
  let openLibraryMetadata = null;

  try {
    googleMetadata = await lookupWithGoogleBooks(isbn);
  } catch (error) {
    lookupErrors.push(`Google Books: ${error.message}`);
  }

  try {
    openLibraryMetadata = await lookupWithOpenLibrary(isbn);
  } catch (error) {
    lookupErrors.push(`Open Library: ${error.message}`);
  }

  const mergedMetadata = mergeMetadata(isbn, googleMetadata, openLibraryMetadata);

  if (hasUsefulMetadata(googleMetadata) || hasUsefulMetadata(openLibraryMetadata)) {
    setCachedMetadata(isbn, mergedMetadata);
    return mergedMetadata;
  }

  const error = new Error(
    "Could not fetch book details from available sources. Please retry or enter details manually."
  );
  error.statusCode = 404;
  error.details = lookupErrors.length
    ? [{ field: "isbn", message: "Metadata providers did not return usable book details." }]
    : undefined;
  throw error;
};

module.exports = {
  getBookMetadataByIsbn,
  validateAndNormalizeIsbn
};
