"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

const DefaultIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToSetMarker({ onSet }: { onSet: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSet(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapClient({
  center,
  zoom,
  marker,
  onSetMarker,
}: {
  center: LatLngExpression;
  zoom: number;
  marker: { lat: number; lng: number } | null;
  onSetMarker: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToSetMarker onSet={onSetMarker} />
      {marker && (
        <Marker position={[marker.lat, marker.lng]} icon={DefaultIcon}>
          <Popup>Lat: {marker.lat}<br />Lng: {marker.lng}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
