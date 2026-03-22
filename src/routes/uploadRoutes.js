const express = require("express");

const { uploadBookImagesToCloudinary } = require("../controllers/uploadController");
const { protect } = require("../middleware/authMiddleware");
const { uploadBookImages } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/images", protect, uploadBookImages, uploadBookImagesToCloudinary);

module.exports = router;
