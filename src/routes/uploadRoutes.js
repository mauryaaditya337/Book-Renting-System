const express = require("express");

const {
  uploadBookImagesToCloudinary,
  uploadSingleBookImageToCloudinary
} = require("../controllers/uploadController");
const { protect } = require("../middleware/authMiddleware");
const { uploadBookImages, uploadSingleBookImage } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/book-image", protect, uploadSingleBookImage, uploadSingleBookImageToCloudinary);
router.post("/images", protect, uploadBookImages, uploadBookImagesToCloudinary);

module.exports = router;
