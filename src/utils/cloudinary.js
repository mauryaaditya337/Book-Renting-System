const { v2: cloudinary } = require("cloudinary");

const DEFAULT_BOOK_IMAGE_FOLDER = "book-renting/books";
let isConfigured = false;

function getMissingCloudinaryEnvVars() {
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  ];

  return requiredEnvVars.filter((envVar) => !process.env[envVar]);
}

function getCloudinary() {
  if (isConfigured) {
    return cloudinary;
  }

  const missingEnvVars = getMissingCloudinaryEnvVars();

  if (missingEnvVars.length > 0) {
    const error = new Error(`Missing Cloudinary configuration: ${missingEnvVars.join(", ")}`);
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
}

function sanitizePublicIdSegment(value = "") {
  return String(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getBookImageFolder() {
  return process.env.CLOUDINARY_FOLDER || DEFAULT_BOOK_IMAGE_FOLDER;
}

function uploadBookImageBuffer(file, options = {}) {
  const cloudinaryClient = getCloudinary();
  const timestamp = Date.now();
  const publicIdSuffix = sanitizePublicIdSegment(file?.originalname) || "book-image";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryClient.uploader.upload_stream(
      {
        folder: getBookImageFolder(),
        resource_type: "image",
        overwrite: false,
        public_id: `${timestamp}-${publicIdSuffix}`,
        ...options
      },
      (error, result) => {
        if (error) {
          if (!error.statusCode) {
            error.statusCode = 502;
          }

          reject(error);
          return;
        }

        if (!result?.secure_url || !result?.public_id) {
          const uploadError = new Error("Cloudinary upload did not return a complete image payload");
          uploadError.statusCode = 502;
          reject(uploadError);
          return;
        }

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

async function deleteCloudinaryResource(publicId) {
  if (!publicId || typeof publicId !== "string") {
    return { result: "not_requested" };
  }

  const cloudinaryClient = getCloudinary();
  return cloudinaryClient.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: "image"
  });
}

module.exports = {
  DEFAULT_BOOK_IMAGE_FOLDER,
  deleteCloudinaryResource,
  getBookImageFolder,
  getCloudinary,
  getMissingCloudinaryEnvVars,
  uploadBookImageBuffer
};
