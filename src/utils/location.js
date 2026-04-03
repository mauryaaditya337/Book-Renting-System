function normalizeCoordinateInput(value, { min, max } = {}) {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return undefined;
  }

  if (typeof min === "number" && parsedValue < min) {
    return undefined;
  }

  if (typeof max === "number" && parsedValue > max) {
    return undefined;
  }

  return parsedValue;
}

function calculateDistanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const startLatitude = normalizeCoordinateInput(fromLatitude, { min: -90, max: 90 });
  const startLongitude = normalizeCoordinateInput(fromLongitude, { min: -180, max: 180 });
  const endLatitude = normalizeCoordinateInput(toLatitude, { min: -90, max: 90 });
  const endLongitude = normalizeCoordinateInput(toLongitude, { min: -180, max: 180 });

  if (
    typeof startLatitude !== "number" ||
    typeof startLongitude !== "number" ||
    typeof endLatitude !== "number" ||
    typeof endLongitude !== "number"
  ) {
    return null;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(endLatitude - startLatitude);
  const longitudeDelta = toRadians(endLongitude - startLongitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(startLatitude)) *
      Math.cos(toRadians(endLatitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusKm * angularDistance;
}

module.exports = {
  normalizeCoordinateInput,
  calculateDistanceKm
};
