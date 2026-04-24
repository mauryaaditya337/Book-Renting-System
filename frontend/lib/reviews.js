export function formatAverageRating(value) {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "New";
  }

  return numericValue.toFixed(1);
}

export function getRatingLabel(value) {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "No ratings yet";
  }

  return `${numericValue.toFixed(1)} / 5`;
}

export function renderStars(rating, max = 5) {
  const safeRating = Math.max(0, Math.min(max, Number(rating || 0)));
  const filledStars = Math.round(safeRating);

  return Array.from({ length: max }, (_, index) => (index < filledStars ? "\u2605" : "\u2606")).join("");
}
