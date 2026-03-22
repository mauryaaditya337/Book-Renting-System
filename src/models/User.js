const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name must be less than 50 characters long"]
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
      maxlength: [60, "City must be less than 60 characters long"]
    },
    state: {
      type: String,
      trim: true,
      maxlength: [60, "State must be less than 60 characters long"]
    },
    pincode: {
      type: String,
      trim: true,
      maxlength: [20, "Pincode must be less than 20 characters long"]
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio must be less than 500 characters long"]
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
