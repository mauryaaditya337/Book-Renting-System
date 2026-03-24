export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function getListingType(book) {
  return book?.listingType || "rent";
}

export function getListingPriceSummary(book) {
  const listingType = getListingType(book);
  const rentalPrice = formatPrice(book?.rentalPrice);
  const salePrice = formatPrice(book?.salePrice);

  if (listingType === "sell") {
    return {
      primaryLabel: "Price",
      primaryValue: salePrice,
      secondaryLabel: "",
      secondaryValue: "",
      inlineSummary: `Price: ${salePrice}`
    };
  }

  if (listingType === "both") {
    return {
      primaryLabel: "Rent",
      primaryValue: `${rentalPrice}/day`,
      secondaryLabel: "Buy",
      secondaryValue: salePrice,
      inlineSummary: `Rent: ${rentalPrice}/day | Buy: ${salePrice}`
    };
  }

  return {
    primaryLabel: "Rental price",
    primaryValue: `${rentalPrice}/day`,
    secondaryLabel: "",
    secondaryValue: "",
    inlineSummary: `Rent: ${rentalPrice}/day`
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
