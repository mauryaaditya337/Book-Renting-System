const Book = require("../models/Book");
const validateRequest = require("../utils/validateRequest");
const asyncHandler = require("../middleware/asyncHandler");
const { getCoverImage, getImagesFromPayload, getResponseImages } = require("../utils/bookImages");

const formatBookResponse = (book) => ({
  id: book._id,
  title: book.title,
  author: book.author,
  isbn: book.isbn || "",
  category: book.category,
  description: book.description,
  condition: book.condition,
  rentalPrice: book.rentalPrice,
  securityDeposit: book.securityDeposit,
  location: book.location,
  availabilityStatus: book.availabilityStatus,
  images: getResponseImages(book),
  imageUrl: getCoverImage(book),
  owner: {
    id: book.owner._id || book.owner,
    name: book.owner.name,
    email: book.owner.email
  },
  createdAt: book.createdAt,
  updatedAt: book.updatedAt
});

const getBookById = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id).populate("owner", "name email");

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

  const book = await Book.findById(req.params.id);

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
    "securityDeposit",
    "location",
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

  const normalizedImages = getImagesFromPayload(req.body);
  if (normalizedImages !== null) {
    book.images = normalizedImages;
    book.imageUrl = normalizedImages[0] || "";
  }

  const updatedBook = await book.save();
  await updatedBook.populate("owner", "name email");

  res.status(200).json({
    message: "Book listing updated successfully",
    book: formatBookResponse(updatedBook)
  });
});

const deleteOwnBookListing = asyncHandler(async (req, res) => {
  validateRequest(req);

  const book = await Book.findById(req.params.id);

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

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const filters = {
    availabilityStatus: "available"
  };

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

  let sort = { createdAt: -1 };

  if (req.query.sortBy === "rentalPrice") {
    sort = { rentalPrice: req.query.sortOrder === "asc" ? 1 : -1 };
  }

  const [books, totalBooks] = await Promise.all([
    Book.find(filters)
      .populate("owner", "name email")
      .sort(sort)
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
      .populate("owner", "name email")
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
    rentalPrice: req.body.rentalPrice,
    securityDeposit: req.body.securityDeposit,
    location: req.body.location,
    images: normalizedImages,
    imageUrl: normalizedImages?.[0] || "",
    owner: req.user._id
  });

  const populatedBook = await Book.findById(book._id).populate("owner", "name email");

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
