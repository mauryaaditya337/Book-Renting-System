const Book = require("../models/Book");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");
const { getCoverImage, getImagesFromPayload, getResponseImages } = require("../utils/bookImages");

function getAvailabilityStatus(book) {
  if (book?.availabilityStatus === "unavailable") {
    return "reserved";
  }

  return book?.availabilityStatus || "available";
}

const formatBookResponse = (book) => ({
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
      email: book.owner.email || ""
    }
  : null,
  createdAt: book.createdAt,
  updatedAt: book.updatedAt
});

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

  const book = await Book.findById(req.params.id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber email");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    book: formatBookResponse(book)
  });
});

const updateOwnBookListing = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber email");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  if (book.owner.toString() !== req.user._id.toString()) {
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
    "meetupLocation",
    "depositNote",
    "availabilityStatus",
    "images",
    "imageUrl"
  ];

  for (const field of allowedFields) {
    if (field === "images" || field === "imageUrl") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
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
  await updatedBook.populate("owner", "fullName collegeName currentDegree city bio name phoneNumber email");

  res.status(200).json({
    message: "Book listing updated successfully",
    book: formatBookResponse(updatedBook)
  });
});

const deleteOwnBookListing = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber email");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  if (book.owner.toString() !== req.user._id.toString()) {
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
      "fullName collegeName currentDegree city bio name phoneNumber email"
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
      .populate("owner", "fullName collegeName currentDegree city bio name phoneNumber email")
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
    meetupLocation: req.body.meetupLocation,
    depositNote: req.body.depositNote,
    images: normalizedImages,
    imageUrl: normalizedImages?.[0] || "",
    owner: req.user._id
  });

  const populatedBook = await Book.findById(book._id).populate("owner", "fullName collegeName currentDegree city bio name phoneNumber email");

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
