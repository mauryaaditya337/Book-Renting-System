export function formatRequestDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatRequestDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function getRequestStatusTone(status) {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "active") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "completed") {
    return "bg-teal-50 text-teal-700 border-teal-200";
  }

  return "bg-rose-50 text-rose-700 border-rose-200";
}

export function toRequestStatusLabel(status) {
  if (!status) {
    return "";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
