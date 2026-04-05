const asyncHandler = require("../middleware/asyncHandler");
const Book = require("../models/Book");

const allowedListingTypes = ["rent", "sell", "both"];
const allowedAvailabilityStatuses = ["available", "reserved", "rented", "sold"];

function buildAdminBookFilters(query = {}) {
  const filters = {};
  const trimmedSearch = String(query.search || "").trim();

  if (trimmedSearch) {
    const safePattern = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safePattern, "i");

    filters.$or = [{ title: regex }, { author: regex }, { category: regex }];
  }

  if (allowedListingTypes.includes(query.listingType)) {
    filters.listingType = query.listingType;
  }

  if (allowedAvailabilityStatuses.includes(query.availabilityStatus)) {
    filters.availabilityStatus = query.availabilityStatus;
  }

  return filters;
}

function formatAdminBookOwner(owner) {
  if (!owner) {
    return null;
  }

  return {
    _id: owner._id,
    fullName: owner.fullName || owner.name || "",
    name: owner.name || owner.fullName || "",
    email: owner.email || ""
  };
}

function formatAdminBookListItem(book) {
  return {
    _id: book._id,
    title: book.title || "",
    author: book.author || "",
    category: book.category || "",
    listingType: book.listingType || "rent",
    availabilityStatus: book.availabilityStatus || "available",
    rentalPrice: typeof book.rentalPrice === "number" ? book.rentalPrice : null,
    salePrice: typeof book.salePrice === "number" ? book.salePrice : null,
    securityDeposit: typeof book.securityDeposit === "number" ? book.securityDeposit : null,
    createdAt: book.createdAt,
    owner: formatAdminBookOwner(book.owner)
  };
}

function formatAdminBookDetail(book) {
  return {
    ...formatAdminBookListItem(book),
    description: book.description || "",
    imageUrl: book.imageUrl || "",
    updatedAt: book.updatedAt
  };
}

const getAdminBooks = asyncHandler(async (req, res) => {
  const filters = buildAdminBookFilters(req.query);

  const books = await Book.find(filters)
    .populate("owner", "fullName name email")
    .sort({ createdAt: -1, _id: -1 });

  res.status(200).json({
    books: books.map(formatAdminBookListItem)
  });
});

const getAdminBookById = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate("owner", "fullName name email");

  if (!book) {
    const error = new Error("Book not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    book: formatAdminBookDetail(book)
  });
});

module.exports = {
  getAdminBooks,
  getAdminBookById
};
