const USER_LOCATION_STORAGE_KEY = "userCurrentLocation";

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function normalizeCoordinates(latitude, longitude) {
  const normalizedLatitude = toNumber(latitude);
  const normalizedLongitude = toNumber(longitude);

  if (
    normalizedLatitude == null ||
    normalizedLongitude == null ||
    normalizedLatitude < -90 ||
    normalizedLatitude > 90 ||
    normalizedLongitude < -180 ||
    normalizedLongitude > 180
  ) {
    return null;
  }

  return {
    latitude: normalizedLatitude,
    longitude: normalizedLongitude
  };
}

export function calculateDistanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const start = normalizeCoordinates(fromLatitude, fromLongitude);
  const end = normalizeCoordinates(toLatitude, toLongitude);

  if (!start || !end) {
    return null;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

export function formatDistanceKm(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return "";
  }

  const value = distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString();
  return `${value} km away`;
}

export function enrichBookWithDistance(book, userLocation) {
  if (!book || !userLocation) {
    return {
      ...book,
      distanceKm: null,
      distance: "",
      distanceText: ""
    };
  }

  const distanceKm = calculateDistanceKm(
    userLocation.latitude,
    userLocation.longitude,
    book.latitude,
    book.longitude
  );
  const distanceText = formatDistanceKm(distanceKm);

  return {
    ...book,
    distanceKm,
    distance: distanceText,
    distanceText
  };
}

export function enrichBooksWithDistance(books = [], userLocation) {
  return books.map((book) => enrichBookWithDistance(book, userLocation));
}

export function getStoredUserLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(USER_LOCATION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    return normalizeCoordinates(parsedValue?.latitude, parsedValue?.longitude);
  } catch (_error) {
    return null;
  }
}

export function saveUserLocation(location) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedLocation = normalizeCoordinates(location?.latitude, location?.longitude);

  if (!normalizedLocation) {
    window.localStorage.removeItem(USER_LOCATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(normalizedLocation));
}

export function requestBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in window.navigator)) {
      reject(new Error("Geolocation is not available in this browser."));
      return;
    }

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        const normalizedLocation = normalizeCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );

        if (!normalizedLocation) {
          reject(new Error("Unable to read your current location."));
          return;
        }

        saveUserLocation(normalizedLocation);
        resolve(normalizedLocation);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
}
