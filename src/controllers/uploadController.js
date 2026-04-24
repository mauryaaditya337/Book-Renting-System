const asyncHandler = require("../middleware/asyncHandler");
const { MAX_BOOK_IMAGES, MIN_BOOK_IMAGES } = require("../utils/bookImages");
const { uploadBookImageBuffer } = require("../utils/cloudinary");

const sanitizeUploadResponse = (payload = {}) => ({
  imageUrl: payload.imageUrl,
  publicId: payload.publicId
});

const uploadSingleBookImageToCloudinary = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    const error = new Error("Image file is required");
    error.statusCode = 400;
    throw error;
  }

  const uploadedImage = await uploadBookImageBuffer(file);

  res.status(200).json({
    success: true,
    ...sanitizeUploadResponse(uploadedImage)
  });
});

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

  const uploadedImages = await Promise.all(
    files.map((file) => uploadBookImageBuffer(file))
  );
  const images = uploadedImages.map((image) => image.imageUrl);

  res.status(200).json({ images });
});

module.exports = {
  uploadBookImagesToCloudinary,
  uploadSingleBookImageToCloudinary
};
