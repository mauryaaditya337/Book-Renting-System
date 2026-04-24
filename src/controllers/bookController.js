const Book = require("../models/Book");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");
const { getCoverImage, getImagesFromPayload, getResponseImages } = require("../utils/bookImages");
const { calculateDistanceKm, normalizeCoordinateInput } = require("../utils/location");
const { getReviewSummaryForUser } = require("../services/reviewService");

function getOwnerId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
}

function getAvailabilityStatus(book) {
  if (book?.availabilityStatus === "unavailable") {
    return "reserved";
  }

  return book?.availabilityStatus || "available";
}

const formatBookResponse = (book, { ownerReviewSummary = null } = {}) => ({
  id: book._id,
  title: book.title,
  author: book.author,
  isbn: book.isbn || "",
  category: book.category,
  description: book.description,
  condition: book.condition,
  rentalPrice: book.rentalPrice,
  listingType: book.listingType || "rent",
  salePrice: typeof book.salePrice === "number" ? book.salePrice : null,
  securityDeposit: book.securityDeposit,
  location: book.location,
  pickupLocationName: book.pickupLocationName || "",
  latitude: typeof book.latitude === "number" ? book.latitude : null,
  longitude: typeof book.longitude === "number" ? book.longitude : null,
  meetupLocation: book.meetupLocation || "",
  depositNote: book.depositNote || "",
  availabilityStatus: getAvailabilityStatus(book),
  images: getResponseImages(book),
  imageUrl: getCoverImage(book),
  owner: book.owner
  ? {
      id: book.owner._id || book.owner,
      fullName: book.owner.fullName || book.owner.name || "",
      collegeName: book.owner.collegeName || " ",
      currentDegree: book.owner.currentDegree || "",
      city: book.owner.city || "",
      bio: book.owner.bio || "",
      phoneNumber: book.owner.phoneNumber || " ",
      name: book.owner.name || book.owner.fullName || " ",
      reviewSummary: ownerReviewSummary || {
        averageRating: 0,
        totalReviews: 0
      }
    }
  : null,
  createdAt: book.createdAt,
  updatedAt: book.updatedAt
});

function getNormalizedCoordinates(payload = {}) {
  return {
    latitude: normalizeCoordinateInput(payload.latitude, { min: -90, max: 90 }),
    longitude: normalizeCoordinateInput(payload.longitude, { min: -180, max: 180 })
  };
}

const availabilityRankExpression = {
  $switch: {
    branches: [
      {
        case: {
          $eq: [{ $ifNull: ["$availabilityStatus", "available"] }, "available"]
        },
        then: 0
      },
      {
        case: {
          $in: [{ $ifNull: ["$availabilityStatus", "available"] }, ["reserved", "unavailable"]]
        },
        then: 1
      },
      {
        case: {
          $eq: [{ $ifNull: ["$availabilityStatus", "available"] }, "rented"]
        },
        then: 2
      },
      {
        case: {
          $eq: [{ $ifNull: ["$availabilityStatus", "available"] }, "sold"]
        },
        then: 3
      }
    ],
    default: 4
  }
};

const getBookById = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  const ownerReviewSummary = await getReviewSummaryForUser(book.owner?._id || book.owner);

  res.status(200).json({
    book: formatBookResponse(book, { ownerReviewSummary })
  });
});

const updateOwnBookListing = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  if (getOwnerId(book.owner) !== getOwnerId(req.user)) {
    const error = new Error("You are not authorized to update this book");
    error.statusCode = 403;
    throw error;
  }

  const allowedFields = [
    "title",
    "author",
    "isbn",
    "category",
    "description",
    "condition",
    "rentalPrice",
    "listingType",
    "salePrice",
    "securityDeposit",
    "location",
    "pickupLocationName",
    "latitude",
    "longitude",
    "meetupLocation",
    "depositNote",
    "images",
    "imageUrl"
  ];

  for (const field of allowedFields) {
    if (field === "images" || field === "imageUrl") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if (field === "latitude") {
        book.latitude = normalizeCoordinateInput(req.body.latitude, { min: -90, max: 90 });
        continue;
      }

      if (field === "longitude") {
        book.longitude = normalizeCoordinateInput(req.body.longitude, { min: -180, max: 180 });
        continue;
      }

      book[field] = req.body[field];
    }
  }

  if (book.listingType === "rent") {
    book.salePrice = null;
  }

  if (book.listingType === "sell") {
    if (typeof book.rentalPrice !== "number") {
      book.rentalPrice = 0;
    }

    if (typeof book.securityDeposit !== "number") {
      book.securityDeposit = 0;
    }
  }

  const normalizedImages = getImagesFromPayload(req.body);
  if (normalizedImages !== null) {
    book.images = normalizedImages;
    book.imageUrl = normalizedImages[0] || "";
  }

  const updatedBook = await book.save();
  await updatedBook.populate("owner", "fullName collegeName currentDegree city bio name phoneNumber");

  res.status(200).json({
    message: "Book listing updated successfully",
    book: formatBookResponse(updatedBook)
  });
});

const deleteOwnBookListing = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  if (getOwnerId(book.owner) !== getOwnerId(req.user)) {
    const error = new Error("You are not authorized to delete this book");
    error.statusCode = 403;
    throw error;
  }

  await book.deleteOne();

  res.status(200).json({
    message: "Book listing deleted successfully"
  });
});

const getBooks = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filters = {};
  const queryLatitude = normalizeCoordinateInput(req.query.latitude, { min: -90, max: 90 });
  const queryLongitude = normalizeCoordinateInput(req.query.longitude, { min: -180, max: 180 });

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filters.$or = [{ title: searchRegex }, { author: searchRegex }];
  }

  if (req.query.category) {
    filters.category = req.query.category;
  }

  if (req.query.location) {
    filters.location = req.query.location;
  }

  let sort = {
    availabilityRank: 1,
    createdAt: -1,
    _id: 1
  };

  if (req.query.sortBy === "rentalPrice") {
    sort = {
      availabilityRank: 1,
      rentalPrice: req.query.sortOrder === "asc" ? 1 : -1,
      createdAt: -1,
      _id: 1
    };
  }

  if (req.query.sortBy === "distance" && queryLatitude != null && queryLongitude != null) {
    const books = await Book.find(filters)
      .populate("owner", "fullName collegeName currentDegree city bio name phoneNumber");

    const sortedBooks = books
      .map((book) => ({
        book,
        availabilityRank:
          book.availabilityStatus === "available"
            ? 0
            : ["reserved", "unavailable"].includes(book.availabilityStatus)
              ? 1
              : book.availabilityStatus === "rented"
                ? 2
                : book.availabilityStatus === "sold"
                  ? 3
                  : 4,
        distanceValue: calculateDistanceKm(
          queryLatitude,
          queryLongitude,
          book.latitude,
          book.longitude
        )
      }))
      .sort((left, right) => {
        if (left.availabilityRank !== right.availabilityRank) {
          return left.availabilityRank - right.availabilityRank;
        }

        if (left.distanceValue == null && right.distanceValue == null) {
          return right.book.createdAt.getTime() - left.book.createdAt.getTime();
        }

        if (left.distanceValue == null) {
          return 1;
        }

        if (right.distanceValue == null) {
          return -1;
        }

        if (left.distanceValue !== right.distanceValue) {
          return left.distanceValue - right.distanceValue;
        }

        return right.book.createdAt.getTime() - left.book.createdAt.getTime();
      });

    const totalBooks = sortedBooks.length;
    const totalPages = Math.max(1, Math.ceil(totalBooks / limit));

    res.status(200).json({
      books: sortedBooks.slice(skip, skip + limit).map((entry) => formatBookResponse(entry.book)),
      totalBooks,
      currentPage: page,
      totalPages
    });

    return;
  }

  const [bookResults, totalBooks] = await Promise.all([
    Book.aggregate([
      { $match: filters },
      {
        $addFields: {
          availabilityRank: availabilityRankExpression
        }
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit }
    ]),
    Book.countDocuments(filters)
  ]);

  const bookIds = bookResults.map((book) => book._id);
  const booksById = new Map();

  if (bookIds.length > 0) {
    const books = await Book.find({ _id: { $in: bookIds } }).populate(
      "owner",
      "fullName collegeName currentDegree city bio name phoneNumber"
    );

    for (const book of books) {
      booksById.set(String(book._id), book);
    }
  }

  const orderedBooks = bookIds
    .map((id) => booksById.get(String(id)))
    .filter(Boolean);

  const totalPages = Math.max(1, Math.ceil(totalBooks / limit));

  res.status(200).json({
    books: orderedBooks.map(formatBookResponse),
    totalBooks,
    currentPage: page,
    totalPages
  });
});

const getOwnBooks = asyncHandler(async (req, res) => {
  validateRequest(req);

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const filters = {
    owner: req.user._id
  };

  const [books, totalBooks] = await Promise.all([
    Book.find(filters)
      .populate("owner", "fullName collegeName currentDegree city bio name phoneNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Book.countDocuments(filters)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalBooks / limit));

  res.status(200).json({
    books: books.map(formatBookResponse),
    totalBooks,
    currentPage: page,
    totalPages
  });
});

const createBookListing = asyncHandler(async (req, res) => {
  validateRequest(req);

  const normalizedImages = getImagesFromPayload(req.body);
  const normalizedCoordinates = getNormalizedCoordinates(req.body);

  const book = await Book.create({
    title: req.body.title,
    author: req.body.author,
    isbn: req.body.isbn,
    category: req.body.category,
    description: req.body.description,
    condition: req.body.condition,
    listingType: req.body.listingType || "rent",
    rentalPrice: req.body.rentalPrice,
    salePrice: req.body.listingType === "rent" ? null : req.body.salePrice,
    securityDeposit: req.body.securityDeposit,
    location: req.body.location,
    pickupLocationName: req.body.pickupLocationName,
    latitude: normalizedCoordinates.latitude,
    longitude: normalizedCoordinates.longitude,
    meetupLocation: req.body.meetupLocation,
    depositNote: req.body.depositNote,
    images: normalizedImages,
    imageUrl: normalizedImages?.[0] || "",
    owner: req.user._id
  });

  const populatedBook = await Book.findById(book._id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber");

  res.status(201).json({
    message: "Book listing created successfully",
    book: formatBookResponse(populatedBook)
  });
});

module.exports = {
  createBookListing,
  getBooks,
  getOwnBooks,
  getBookById,
  updateOwnBookListing,
  deleteOwnBookListing
};
