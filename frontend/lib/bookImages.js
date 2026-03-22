import { apiRequest } from "@/lib/api";

export function getBookImages(book) {
  if (!book) {
    return [];
  }

  const images = Array.isArray(book.images)
    ? book.images.filter((image) => typeof image === "string" && image.trim())
    : [];

  if (images.length > 0) {
    return images;
  }

  return typeof book.imageUrl === "string" && book.imageUrl.trim() ? [book.imageUrl.trim()] : [];
}

export function getPrimaryBookImage(book) {
  return getBookImages(book)[0] || "";
}

function mergeBookImage(book, imageData) {
  if (!book) {
    return book;
  }

  const nextImages = Array.isArray(imageData?.images)
    ? imageData.images.filter((image) => typeof image === "string" && image.trim())
    : [];
  const fallbackImageUrl =
    typeof imageData?.imageUrl === "string" ? imageData.imageUrl.trim() : "";
  const currentImages = getBookImages(book);
  const mergedImages = nextImages.length > 0 ? nextImages : currentImages;
  const mergedImageUrl = mergedImages[0] || fallbackImageUrl || "";

  return {
    ...book,
    images: mergedImages,
    imageUrl: mergedImageUrl
  };
}

export async function hydrateRequestBookImages(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return requests || [];
  }

  const missingBookIds = Array.from(
    new Set(
      requests
        .map((request) => request.book)
        .filter((book) => book?.id && getBookImages(book).length === 0)
        .map((book) => book.id)
    )
  );

  if (missingBookIds.length === 0) {
    return requests;
  }

  const booksById = new Map();

  await Promise.all(
    missingBookIds.map(async (bookId) => {
      try {
        const data = await apiRequest(`/books/${bookId}`, {
          cache: "no-store"
        });

        booksById.set(bookId, {
          images: getBookImages(data.book),
          imageUrl: data.book?.imageUrl || ""
        });
      } catch {
        booksById.set(bookId, {
          images: [],
          imageUrl: ""
        });
      }
    })
  );

  return requests.map((request) => ({
    ...request,
    book: mergeBookImage(request.book, booksById.get(request.book?.id))
  }));
}

export function mergeRequestWithBookImage(currentRequest, nextRequest) {
  if (!currentRequest) {
    return nextRequest;
  }

  return {
    ...currentRequest,
    ...nextRequest,
    book: mergeBookImage(nextRequest?.book || currentRequest.book, {
      images: getBookImages(currentRequest.book),
      imageUrl: currentRequest.book?.imageUrl || ""
    })
  };
}
