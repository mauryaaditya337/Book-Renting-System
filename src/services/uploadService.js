const configureCloudinary = require("../config/cloudinary");

const buildPublicId = (file, index) => {
  const baseName = file.originalname
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${Date.now()}-${index + 1}-${baseName || "book-image"}`;
};

const uploadSingleImage = (file, index) => {
  const cloudinary = configureCloudinary();
  const folder = process.env.CLOUDINARY_FOLDER || "p2p-book-renting/books";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: buildPublicId(file, index),
        overwrite: false
      },
      (error, result) => {
        if (error) {
          if (!error.statusCode) {
            error.statusCode = 502;
          }

          return reject(error);
        }

        if (!result?.secure_url) {
          const uploadError = new Error("Cloudinary upload did not return an image URL");
          uploadError.statusCode = 502;
          return reject(uploadError);
        }

        return resolve(result.secure_url);
      }
    );

    uploadStream.end(file.buffer);
  });
};

const uploadImages = async (files) => Promise.all(
  files.map((file, index) => uploadSingleImage(file, index))
);

module.exports = { uploadImages };
