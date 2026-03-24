const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters long"],
      maxlength: [80, "Full name must be less than 80 characters long"]
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name must be less than 50 characters long"]
    },
    collegeName: {
      type: String,
      required: [true, "College name is required"],
      trim: true,
      minlength: [2, "College name must be at least 2 characters long"],
      maxlength: [120, "College name must be less than 120 characters long"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone must be less than 20 characters long"]
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number must be less than 20 characters long"]
    },
    addressLine1: {
      type: String,
      trim: true,
      maxlength: [120, "Address line 1 must be less than 120 characters long"]
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [120, "Address line 2 must be less than 120 characters long"]
    },
    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: [60, "City must be less than 60 characters long"]
    },
    state: {
      type: String,
      trim: true,
      default: "",
      maxlength: [60, "State must be less than 60 characters long"]
    },
    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [240, "Address must be less than 240 characters long"]
    },
    pincode: {
      type: String,
      trim: true,
      maxlength: [20, "Pincode must be less than 20 characters long"]
    },
    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Bio must be less than 500 characters long"]
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Qualification must be less than 120 characters long"]
    },
    currentDegree: {
      type: String,
      trim: true,
      default: "",
      maxlength: [120, "Current degree must be less than 120 characters long"]
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: [300, "Avatar URL must be less than 300 characters long"]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
