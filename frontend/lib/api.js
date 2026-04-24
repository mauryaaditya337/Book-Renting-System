import { getApiBaseUrl } from "@/lib/auth";

function buildErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((error) => error.message).join(", ");
  }

  return payload.message || fallbackMessage;
}

export async function apiRequest(path, options = {}) {
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(buildErrorMessage(data, "Something went wrong."));
    error.status = response.status;
    error.details = Array.isArray(data?.errors) ? data.errors : [];
    error.payload = data;
    throw error;
  }

  return data;
}
