export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function getListingType(book) {
  return book?.listingType || "rent";
}

export function roundPrice(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getApproxPerDayRent(weeklyRent) {
  return roundPrice((Number(weeklyRent) || 0) / 7);
}

export function getListingPriceSummary(book) {
  const listingType = getListingType(book);
  const rentalPrice = formatPrice(book?.rentalPrice);
  const salePrice = formatPrice(book?.salePrice);
  const perDayRent = formatPrice(getApproxPerDayRent(book?.rentalPrice));

  if (listingType === "sell") {
    return {
      primaryLabel: "Price",
      primaryValue: salePrice,
      secondaryLabel: "",
      secondaryValue: "",
      approxDailyLabel: "",
      approxDailyValue: "",
      inlineSummary: `Price: ${salePrice}`
    };
  }

  if (listingType === "both") {
    return {
      primaryLabel: "Rent per week",
      primaryValue: `${rentalPrice}/week`,
      secondaryLabel: "Buy",
      secondaryValue: salePrice,
      approxDailyLabel: "Approx per day",
      approxDailyValue: `≈ ${perDayRent}/day`,
      inlineSummary: `Rent: ${rentalPrice}/week | Approx: ${perDayRent}/day | Buy: ${salePrice}`
    };
  }

  return {
    primaryLabel: "Rent per week",
    primaryValue: `${rentalPrice}/week`,
    secondaryLabel: "",
    secondaryValue: "",
    approxDailyLabel: "Approx per day",
    approxDailyValue: `≈ ${perDayRent}/day`,
    inlineSummary: `Rent: ${rentalPrice}/week | Approx: ${perDayRent}/day`
  };
}

export function getAvailabilityTone(status) {
  if (status === "available") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "reserved") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "rented") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (status === "sold") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function toTitleCase(value) {
  if (!value) {
    return "";
  }

  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
