const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_API_URL = "https://openlibrary.org/api/books";

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
  Boolean(metadata && metadata.title && metadata.author);

const lookupWithGoogleBooks = async (isbn) => {
  const response = await fetch(`${GOOGLE_BOOKS_API_URL}?q=isbn:${encodeURIComponent(isbn)}`);

  if (!response.ok) {
    throw new Error(`Google Books request failed with status ${response.status}`);
  }

  const payload = await response.json();
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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open Library request failed with status ${response.status}`);
  }

  const payload = await response.json();
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

  const lookupErrors = [];

  try {
    const googleMetadata = await lookupWithGoogleBooks(isbn);

    if (hasUsefulMetadata(googleMetadata)) {
      return googleMetadata;
    }
  } catch (error) {
    lookupErrors.push(error.message);
  }

  try {
    const openLibraryMetadata = await lookupWithOpenLibrary(isbn);

    if (hasUsefulMetadata(openLibraryMetadata)) {
      return openLibraryMetadata;
    }
  } catch (error) {
    lookupErrors.push(error.message);
  }

  const error = new Error("No useful metadata found for the provided ISBN");
  error.statusCode = 404;
  error.details = lookupErrors.length
    ? [{ field: "isbn", message: lookupErrors.join(" | ") }]
    : undefined;
  throw error;
};

module.exports = {
  getBookMetadataByIsbn,
  validateAndNormalizeIsbn
};
