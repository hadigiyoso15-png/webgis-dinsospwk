"use client";

import React, { useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
} from "react-leaflet";
import type { LatLngExpression, Map } from "leaflet";
import "leaflet/dist/leaflet.css";

// Contoh data laporan
interface Report {
  id: number;
  title: string;
  description: string;
  location: LatLngExpression;
}

const dummyReports: Report[] = [
  { id: 1, title: "Pohon Tumbang", description: "Pohon tumbang menutupi jalan utama.", location: [-6.9175, 107.6191] },
  { id: 2, title: "Banjir di Jalan XYZ", description: "Air menggenang hingga 50cm, akses terganggu.", location: [-6.914, 107.6205] },
  { id: 3, title: "Lampu Jalan Rusak", description: "Lampu jalan mati di beberapa titik.", location: [-6.920, 107.615] },
];

export default function AdminDashboard() {
  const mapRef = useRef<Map | null>(null);
  const [reports] = useState<Report[]>(dummyReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Admin Dashboard Laporan</h1>

      <MapContainer
        center={[-6.9175, 107.6191]}
        zoom={13}
        style={{ height: "600px", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {reports.map((report) => (
          <CircleMarker
            key={report.id}
            center={report.location}
            radius={6} // ukuran titik
            color="blue" // warna tepi
            fillColor="blue" // warna isi
            fillOpacity={1}
            eventHandlers={{
              click: () => {
                setSelectedReport(report);
              },
            }}
          />
        ))}
      </MapContainer>

      {/* Detail laporan muncul hanya saat titik diklik */}
      {selectedReport && (
        <div className="mt-6 bg-white shadow-md rounded-lg p-6 max-w-3xl w-full">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{selectedReport.title}</h2>
          <p className="text-gray-700 mb-3">{selectedReport.description}</p>
          <p className="text-gray-500 text-sm">
            Lokasi: {selectedReport.location[0]}, {selectedReport.location[1]}
          </p>
        </div>
      )}
    </main>
  );
}
