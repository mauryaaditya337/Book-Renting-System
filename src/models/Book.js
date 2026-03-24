const mongoose = require("mongoose");
const {
  MAX_BOOK_IMAGES,
  MIN_BOOK_IMAGES,
  getCoverImage,
  normalizeBookImages,
  validateImages
} = require("../utils/bookImages");

const allowedConditions = ["New", "Like New", "Good", "Fair", "Poor"];
const allowedAvailabilityStatuses = ["available", "reserved", "rented", "sold"];
const allowedListingTypes = ["rent", "sell", "both"];

function normalizeAvailabilityStatus(status) {
  if (status === "unavailable") {
    return "reserved";
  }

  if (!status) {
    return "available";
  }

  return status;
}

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true
    },
    isbn: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true
    },
    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum: {
        values: allowedConditions,
        message: "Condition must be one of: New, Like New, Good, Fair, Poor"
      }
    },
    rentalPrice: {
      type: Number,
      required() {
        return (this.listingType || "rent") !== "sell";
      },
      min: [0, "Rental price must be at least 0"]
    },
    securityDeposit: {
      type: Number,
      required() {
        return (this.listingType || "rent") !== "sell";
      },
      min: [0, "Security deposit must be at least 0"]
    },
    listingType: {
      type: String,
      default: "rent",
      trim: true,
      enum: {
        values: allowedListingTypes,
        message: "Listing type must be one of: rent, sell, both"
      }
    },
    salePrice: {
      type: Number,
      min: [0, "Sale price must be at least 0"]
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true
    },
    meetupLocation: {
      type: String,
      trim: true
    },
    depositNote: {
      type: String,
      trim: true
    },
    availabilityStatus: {
      type: String,
      required: true,
      default: "available",
      trim: true,
      enum: {
        values: allowedAvailabilityStatuses,
        message: "Availability status must be one of: available, reserved, rented, sold"
      }
    },
    images: {
      type: [String],
      default: undefined,
      validate: [
        {
          validator(value) {
            validateImages(normalizeBookImages(value), { required: true });
            return true;
          },
          message(props) {
            return props.reason?.message || `Images must contain between ${MIN_BOOK_IMAGES} and ${MAX_BOOK_IMAGES} valid absolute URLs`;
          }
        }
      ]
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ""
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"]
    }
  },
  {
    timestamps: true
  }
);

bookSchema.pre("validate", function syncLegacyCoverImage(next) {
  this.availabilityStatus = normalizeAvailabilityStatus(this.availabilityStatus);

  const normalizedImages = normalizeBookImages(this.images);
  const legacyCoverImage = typeof this.imageUrl === "string" ? this.imageUrl.trim() : "";

  if (normalizedImages.length === 0 && legacyCoverImage) {
    this.images = [legacyCoverImage];
  } else if (normalizedImages.length > 0) {
    this.images = normalizedImages;
  }

  this.imageUrl = getCoverImage(this);
  next();
});

module.exports = mongoose.model("Book", bookSchema);
