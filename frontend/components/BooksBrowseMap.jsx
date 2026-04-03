"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import { getListingPriceSummary, toTitleCase } from "@/lib/books";

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function createMarkerIcon({ accentColor, fillColor }) {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
    html: `
      <span style="
        display:flex;
        width:22px;
        height:22px;
        border-radius:9999px;
        border:3px solid ${accentColor};
        background:${fillColor};
        box-shadow:0 10px 24px rgba(15,23,42,0.2);
      "></span>
    `
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
    html: `
      <span style="
        display:flex;
        width:18px;
        height:18px;
        border-radius:9999px;
        border:3px solid #ffffff;
        background:#0f766e;
        box-shadow:0 10px 24px rgba(15,23,42,0.2);
      "></span>
    `
  });
}

function MapViewport({ markerPositions, userLocation, radiusKm }) {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [map]);

  useEffect(() => {
    const allPoints = [...markerPositions];

    if (userLocation) {
      allPoints.push([userLocation.latitude, userLocation.longitude]);
    }

    if (allPoints.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (allPoints.length === 1) {
      const [latitude, longitude] = allPoints[0];
      map.setView([latitude, longitude], radiusKm ? 12 : 13);
      return;
    }

    map.fitBounds(allPoints, {
      padding: [32, 32]
    });
  }, [map, markerPositions, radiusKm, userLocation]);

  return null;
}

function MapPopupContent({ book }) {
  const priceSummary = getListingPriceSummary(book);
  const distanceLabel = book.distanceText || book.distance || "";
  const locationLabel = book.pickupLocationName || book.location || "Pickup point not shared";
  const availabilityLabel = toTitleCase(book.availabilityStatus || "available");

  return (
    <div className="min-w-[14rem] space-y-2 text-sm">
      <div>
        <p className="text-base font-semibold text-slate-900">{book.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{locationLabel}</p>
      </div>
      <div className="grid gap-1 text-[13px] text-slate-700">
        <p>
          <span className="font-medium text-slate-900">{priceSummary.primaryLabel}:</span>{" "}
          {priceSummary.primaryValue}
        </p>
        <p>
          <span className="font-medium text-slate-900">Status:</span> {availabilityLabel}
        </p>
        {distanceLabel ? (
          <p>
            <span className="font-medium text-slate-900">Distance:</span> {distanceLabel}
          </p>
        ) : null}
      </div>
      <Link
        href={`/books/${book.id}`}
        className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
      >
        View details
      </Link>
    </div>
  );
}

export function BooksBrowseMap({ books, userLocation, radiusKm = null }) {
  const mappedBooks = useMemo(
    () =>
      books.filter((book) => isValidCoordinate(book.latitude, book.longitude)),
    [books]
  );

  const markerPositions = useMemo(
    () => mappedBooks.map((book) => [book.latitude, book.longitude]),
    [mappedBooks]
  );

  const userHasLocation = isValidCoordinate(userLocation?.latitude, userLocation?.longitude);
  const userMarker = userHasLocation
    ? [userLocation.latitude, userLocation.longitude]
    : null;

  const bookIcon = useMemo(
    () =>
      createMarkerIcon({
        accentColor: "#ffffff",
        fillColor: "#0f172a"
      }),
    []
  );
  const userIcon = useMemo(() => createUserIcon(), []);

  return (
    <div className="book-browse-map overflow-hidden rounded-[1.9rem] border border-white/70 bg-white/92 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-slate-900">Map view</p>
        <p className="mt-1 text-sm text-slate-600">
          Explore books with pickup coordinates directly on the map.
        </p>
      </div>

      <div className="h-[25rem] sm:h-[28rem]">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewport
            markerPositions={markerPositions}
            userLocation={userHasLocation ? userLocation : null}
            radiusKm={radiusKm}
          />

          {userMarker ? (
            <>
              <Marker position={userMarker} icon={userIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">Your location</p>
                    <p className="mt-1 text-slate-600">
                      Nearby books and radius filtering use this point.
                    </p>
                  </div>
                </Popup>
              </Marker>
              {radiusKm ? (
                <Circle
                  center={userMarker}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: "#0f766e",
                    fillColor: "#99f6e4",
                    fillOpacity: 0.18,
                    weight: 2
                  }}
                />
              ) : null}
            </>
          ) : null}

          {mappedBooks.map((book) => (
            <Marker
              key={book.id}
              position={[book.latitude, book.longitude]}
              icon={bookIcon}
            >
              <Popup>
                <MapPopupContent book={book} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
