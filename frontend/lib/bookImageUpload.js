import { getApiBaseUrl } from "@/lib/auth";

function buildUploadErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((error) => error.message).join(", ");
  }

  return payload.message || fallbackMessage;
}

export function uploadBookImage({ file, token, onProgress }) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Please choose an image to upload."));
      return;
    }

    if (!token) {
      reject(new Error("Please log in to upload images."));
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    const request = new XMLHttpRequest();
    request.open("POST", `${getApiBaseUrl()}/uploads/book-image`);
    request.responseType = "json";
    request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      const payload = request.response;

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      const error = new Error(buildUploadErrorMessage(payload, "Unable to upload image."));
      error.status = request.status;
      error.details = Array.isArray(payload?.errors) ? payload.errors : [];
      error.payload = payload;
      reject(error);
    };

    request.onerror = () => {
      reject(new Error("Unable to upload image right now. Please try again."));
    };

    request.send(formData);
  });
}
