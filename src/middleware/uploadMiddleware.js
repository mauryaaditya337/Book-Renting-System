const multer = require("multer");

const { MAX_BOOK_IMAGES } = require("../utils/bookImages");

const storage = multer.memoryStorage();

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
    files: MAX_BOOK_IMAGES
  }
});

const uploadBookImages = (req, res, next) => {
  const middleware = upload.array("images", MAX_BOOK_IMAGES);

  middleware(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        error.statusCode = 400;
        error.message = `No more than ${MAX_BOOK_IMAGES} images are allowed`;
      } else {
        error.statusCode = 400;
      }
    }

    return next(error);
  });
};

module.exports = { uploadBookImages };
