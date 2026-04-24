import { formatPrice, getApproxPerDayRent, roundPrice } from "@/lib/books";

export const CURRENT_REQUEST_STATUSES = ["pending", "approved", "active", "return_pending"];
export const HISTORY_REQUEST_STATUSES = ["completed", "rejected", "cancelled", "expired"];

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

  if (status === "return_pending") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "completed") {
    return "bg-teal-50 text-teal-700 border-teal-200";
  }

  if (status === "cancelled") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  if (status === "expired") {
    return "bg-orange-50 text-orange-700 border-orange-200";
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

export function isCurrentRequestStatus(status) {
  return CURRENT_REQUEST_STATUSES.includes(status);
}

export function isHistoricalRequestStatus(status) {
  return HISTORY_REQUEST_STATUSES.includes(status);
}

export function calculateRentalDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const differenceInMs = end.getTime() - start.getTime();

  if (differenceInMs <= 0) {
    return 0;
  }

  return Math.round(differenceInMs / (1000 * 60 * 60 * 24));
}

export function calculateRentalPreview(weeklyRent, startDate, endDate) {
  const rentalDays = calculateRentalDays(startDate, endDate);

  if (rentalDays <= 0) {
    return null;
  }

  const normalizedWeeklyRent = roundPrice(weeklyRent);
  const perDayRent = getApproxPerDayRent(normalizedWeeklyRent);
  const totalRent = roundPrice(perDayRent * rentalDays);

  return {
    weeklyRent: normalizedWeeklyRent,
    perDayRent,
    rentalDays,
    totalRent
  };
}

export function getRequestPricingDetails(request) {
  if (!request || request.book?.listingType === "sell") {
    return null;
  }

  const weeklyRent =
    typeof request.weeklyRent === "number" ? request.weeklyRent : Number(request.book?.rentalPrice || 0);
  const perDayRent =
    typeof request.perDayRent === "number" ? request.perDayRent : getApproxPerDayRent(weeklyRent);
  const rentalDays =
    typeof request.rentalDays === "number" ? request.rentalDays : calculateRentalDays(request.startDate, request.endDate);
  const totalRent =
    typeof request.totalRent === "number" ? request.totalRent : roundPrice(perDayRent * rentalDays);

  return [
    { label: "Rent per week", value: formatPrice(weeklyRent) },
    { label: "Approx per day", value: `≈ ${formatPrice(perDayRent)}/day` },
    { label: "Rental days", value: String(rentalDays) },
    { label: "Total rent", value: formatPrice(totalRent) }
  ];
}
