const { v2: cloudinary } = require("cloudinary");

let isConfigured = false;

const getMissingCloudinaryEnvVars = () => {
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  ];

  return requiredEnvVars.filter((envVar) => !process.env[envVar]);
};

const configureCloudinary = () => {
  if (isConfigured) {
    return cloudinary;
  }

  const missingEnvVars = getMissingCloudinaryEnvVars();

  if (missingEnvVars.length > 0) {
    const error = new Error(
      `Missing Cloudinary configuration: ${missingEnvVars.join(", ")}`
    );
    error.statusCode = 500;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  isConfigured = true;

  return cloudinary;
};

module.exports = configureCloudinary;
