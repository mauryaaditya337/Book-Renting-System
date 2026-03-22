const asyncHandler = require("../middleware/asyncHandler");
const { MAX_BOOK_IMAGES, MIN_BOOK_IMAGES } = require("../utils/bookImages");
const { uploadImages } = require("../services/uploadService");

const uploadBookImagesToCloudinary = asyncHandler(async (req, res) => {
  const files = req.files || [];

  if (files.length < MIN_BOOK_IMAGES) {
    const error = new Error(`At least ${MIN_BOOK_IMAGES} image is required`);
    error.statusCode = 400;
    throw error;
  }

  if (files.length > MAX_BOOK_IMAGES) {
    const error = new Error(`No more than ${MAX_BOOK_IMAGES} images are allowed`);
    error.statusCode = 400;
    throw error;
  }

  const images = await uploadImages(files);

  res.status(200).json({ images });
});

module.exports = { uploadBookImagesToCloudinary };
