"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 13;

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

function parseCoordinatePair(latitude, longitude) {
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (!isValidCoordinate(parsedLatitude, parsedLongitude)) {
    return null;
  }

  return [parsedLatitude, parsedLongitude];
}

function createSelectedIcon() {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <span style="
        display:flex;
        width:24px;
        height:24px;
        border-radius:9999px;
        border:4px solid #ffffff;
        background:#0f766e;
        box-shadow:0 10px 24px rgba(15,23,42,0.22);
      "></span>
    `
  });
}

function MapViewport({ selectedPosition }) {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [map]);

  useEffect(() => {
    if (selectedPosition) {
      map.setView(selectedPosition, SELECTED_ZOOM);
      return;
    }

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }, [map, selectedPosition]);

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    }
  });

  return null;
}

export function MapCoordinatePicker({ latitude, longitude, onPick }) {
  const selectedPosition = useMemo(
    () => parseCoordinatePair(latitude, longitude),
    [latitude, longitude]
  );
  const selectedIcon = useMemo(() => createSelectedIcon(), []);

  return (
    <div className="map-coordinate-picker overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white">
      <div className="border-b border-slate-200/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Pick on map</p>
        <p className="mt-1 text-sm text-slate-600">
          Click anywhere on the map to fill latitude and longitude.
        </p>
      </div>

      <div className="h-72 sm:h-80">
        <MapContainer
          center={selectedPosition || DEFAULT_CENTER}
          zoom={selectedPosition ? SELECTED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewport selectedPosition={selectedPosition} />
          <MapClickHandler onPick={onPick} />

          {selectedPosition ? <Marker position={selectedPosition} icon={selectedIcon} /> : null}
        </MapContainer>
      </div>

      <div className="border-t border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
        {selectedPosition
          ? `Selected coordinates: ${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`
          : "No map point selected yet. You can still type coordinates manually below."}
      </div>
    </div>
  );
}
