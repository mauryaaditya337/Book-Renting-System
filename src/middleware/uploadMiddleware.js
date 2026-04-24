const multer = require("multer");

const { MAX_BOOK_IMAGES } = require("../utils/bookImages");

const storage = multer.memoryStorage();
const MAX_BOOK_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    const error = new Error(`Only image files are allowed: ${file.originalname}`);
    error.statusCode = 400;
    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: MAX_BOOK_IMAGES,
    fileSize: MAX_BOOK_IMAGE_FILE_SIZE_BYTES
  }
});

const mapMulterError = (error) => {
  if (!(error instanceof multer.MulterError)) {
    return error;
  }

  error.statusCode = 400;

  if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
    error.message = `No more than ${MAX_BOOK_IMAGES} images are allowed`;
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    error.message = `Each image must be smaller than ${Math.floor(MAX_BOOK_IMAGE_FILE_SIZE_BYTES / (1024 * 1024))}MB`;
  }

  return error;
};

const uploadBookImages = (req, res, next) => {
  const middleware = upload.array("images", MAX_BOOK_IMAGES);

  middleware(req, res, (error) => {
    if (!error) {
      return next();
    }

    return next(mapMulterError(error));
  });
};

const uploadSingleBookImage = (req, res, next) => {
  const middleware = upload.single("image");

  middleware(req, res, (error) => {
    if (!error) {
      return next();
    }

    return next(mapMulterError(error));
  });
};

module.exports = {
  MAX_BOOK_IMAGE_FILE_SIZE_BYTES,
  uploadBookImages,
  uploadSingleBookImage
};
