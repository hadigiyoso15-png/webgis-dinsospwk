"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Hal penting:
 * - Pastikan public/desa.geojson & public/kecamatan.geojson tersedia.
 * - GeoJSON harus punya attribute:
 *    - Kecamatan: feature.properties.WADMKC
 *    - Desa: feature.properties.WADMKD dan (opsional) WADMKC
 *
 * File ini menyediakan dummy PKH (jumlah penerima + penduduk) untuk masing2 kode.
 */

type PKHRecord = {
  jumlah: number; // jumlah penerima
  penduduk: number; // total penduduk
};

export default function HomePage() {
  const mapRef = useRef<L.Map | null>(null);
  const desaLayerRef = useRef<L.GeoJSON | null>(null);
  const kecLayerRef = useRef<L.GeoJSON | null>(null);
  const legendRef = useRef<L.Control | null>(null);

  // UI state
  const [metric, setMetric] = useState<"jumlah" | "per1000">("per1000");

  // ====== Dummy PKH data (contoh) ======
  // Format: kode -> { jumlah, penduduk }
  // *Kamu bisa ganti nilai-nilai ini sesuai kebutuhan*
  const dummyKecamatan: Record<string, PKHRecord> = {
    // contoh kode kecamatan
    "Purwakarta": { jumlah: 3500, penduduk: 42000 },
    KEC_B: { jumlah: 120, penduduk: 18000 },
    KEC_C: { jumlah: 500, penduduk: 60000 },
    KEC_D: { jumlah: 45, penduduk: 8000 },
    KEC_E: { jumlah: 210, penduduk: 25000 },
  };

  const dummyDesa: Record<string, PKHRecord> = {
    // contoh kode desa
    "Nagri Kidul": { jumlah: 40, penduduk: 3200 },
    DESA_A2: { jumlah: 120, penduduk: 8200 },
    DESA_B1: { jumlah: 30, penduduk: 2000 },
    DESA_B2: { jumlah: 90, penduduk: 4600 },
    DESA_C1: { jumlah: 200, penduduk: 24000 },
    DESA_C2: { jumlah: 150, penduduk: 12000 },
    DESA_D1: { jumlah: 10, penduduk: 1200 },
    DESA_E1: { jumlah: 60, penduduk: 5200 },
    DESA_E2: { jumlah: 150, penduduk: 8000 },
  };

  // Utility: ambil nilai metrik yang akan dipakai (jumlah atau per1000)
  function valueFor(record?: PKHRecord, metricChoice: "jumlah" | "per1000" = "per1000") {
    if (!record) return 0;
    if (metricChoice === "jumlah") return record.jumlah;
    return (record.jumlah / record.penduduk) * 1000;
  }

  // Hitung quantile breaks sederhana
  function quantileBreaks(values: number[], classes = 5) {
    if (!values.length) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const breaks: number[] = [];
    for (let i = 1; i < classes; i++) {
      const q = i / classes;
      const pos = q * (sorted.length - 1);
      const lower = Math.floor(pos);
      const upper = Math.ceil(pos);
      const interp = lower === upper ? sorted[pos] : sorted[lower] + (pos - lower) * (sorted[upper] - sorted[lower]);
      breaks.push(interp);
    }
    return breaks;
  }

  // Fungsi warna berdasarkan breaks (5 kelas)
  function getColorFor(value: number, breaks: number[]) {
    // breaks length = classes-1
    if (breaks.length === 0) return "#fff";
    if (value > breaks[breaks.length - 1]) return "#800026";
    for (let i = breaks.length - 1; i >= 0; i--) {
      if (value > breaks[i]) {
        const colors = ["#BD0026", "#E31A1C", "#FC4E2A", "#FD8D3C", "#FFEDA0"];
        return colors[i];
      }
    }
    return "#FFEDA0";
  }

  // Create legend control HTML
  function createLegendHTML(breaks: number[], metricChoice: "jumlah" | "per1000") {
    const labels: string[] = [];
    const formatter = (v: number) =>
      metricChoice === "jumlah" ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`; // per1000 rounded 1 decimal
    const colors = ["#FFEDA0", "#FD8D3C", "#FC4E2A", "#E31A1C", "#BD0026"]; // low -> high
    const ranges: string[] = [];

    // build ranges from breaks
    let prev = 0;
    for (let i = 0; i < breaks.length; i++) {
      ranges.push(`${formatter(prev)} – ${formatter(breaks[i])}`);
      prev = breaks[i];
    }
    ranges.push(`${formatter(prev)} – ${formatter(breaks[breaks.length - 1])}`);
    // but ensure length 5
    const finalRanges = [
      `< ${formatter(breaks[0])}`,
      `${formatter(breaks[0])} – ${formatter(breaks[1] ?? breaks[0])}`,
      `${formatter(breaks[1] ?? 0)} – ${formatter(breaks[2] ?? breaks[1] ?? 0)}`,
      `${formatter(breaks[2] ?? 0)} – ${formatter(breaks[3] ?? breaks[2] ?? 0)}`,
      `> ${formatter(breaks[breaks.length - 1])}`,
    ];

    // Build HTML
    let html = `<div style="padding:6px;font-size:12px;background:white;border-radius:4px;box-shadow:0 0 6px rgba(0,0,0,0.2)"><b>Legend (${metricChoice === "jumlah" ? "Jumlah" : "Per 1000"})</b><br/>`;
    for (let i = 0; i < 5; i++) {
      const color = colors[4 - i]; // align high->red
      const range = finalRanges[i] ?? "";
      html += `<i style="background:${color};width:18px;height:12px;display:inline-block;margin-right:6px;border:1px solid #999"></i>${range}<br/>`;
    }
    html += `</div>`;
    return html;
  }

  // Rebuild layers with choropleth styling (dipanggil on init & on metric change)
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing geojson layers (if any)
    if (desaLayerRef.current) {
      desaLayerRef.current.remove();
      desaLayerRef.current = null;
    }
    if (kecLayerRef.current) {
      kecLayerRef.current.remove();
      kecLayerRef.current = null;
    }
    if (legendRef.current) {
      legendRef.current.remove();
      legendRef.current = null;
    }

    // Load geojson files, compute values and breaks, then create layers
    // 1) Kecamatan
    fetch("/kecamatan.geojson")
      .then((res) => res.json())
      .then((geo) => {
        // extract values for classification
        const vals: number[] = [];
        (geo.features || []).forEach((f: any) => {
          const code: string = f.properties?.WADMKC;
          const rec = dummyKecamatan[code];
          const v = valueFor(rec, metric);
          vals.push(v);
        });

        const breaks = quantileBreaks(vals.filter((v) => v !== undefined && !Number.isNaN(v)), 5);

        const g = L.geoJSON(geo, {
          style: (feature) => {
            const code: string = feature.properties?.WADMKC;
            const rec = dummyKecamatan[code];
            const v = valueFor(rec, metric);
            const color = getColorFor(v, breaks);
            return {
              color: "#666",
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.7,
            } as L.PathOptions;
          },
          onEachFeature: (feature, layer) => {
            // popup + tooltip
            const code: string = feature.properties?.WADMKC;
            const name: string = feature.properties?.WADMKC ?? "Unknown";
            const rec = dummyKecamatan[code];
            const v = valueFor(rec, metric);
            const valueLabel = metric === "jumlah" ? `${rec?.jumlah ?? 0}` : `${Math.round((v + Number.EPSILON) * 10) / 10}`;
            layer.bindTooltip(`Kecamatan: ${name}`, { sticky: true });
            layer.bindPopup(
              `<b>Kecamatan:</b> ${name}<br/><b>Kode:</b> ${code ?? "-"}<br/><b>${
                metric === "jumlah" ? "Jumlah PKH" : "PKH/1000"
              }:</b> ${valueLabel}`
            );

            // highlight
            layer.on("mouseover", () => {
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 3,
                  color: "#FFFF00",
                  fillOpacity: 0.9,
                });
              }
            });
            layer.on("mouseout", () => {
              if (layer instanceof L.Path) {
                // reset by re-applying base style (recompute)
                const rec2 = dummyKecamatan[feature.properties?.WADMKC];
                const v2 = valueFor(rec2, metric);
                const color2 = getColorFor(v2, breaks);
                layer.setStyle({
                  weight: 1.5,
                  color: "#666",
                  fillColor: color2,
                  fillOpacity: 0.7,
                });
              }
            });
          },
        });

        kecLayerRef.current = g;
        // add by default
        g.addTo(mapRef.current!);

        // legend (use kecamatan breaks for legend when kec layer present)
        const legend = L.control({ position: "bottomright" });
        legend.onAdd = () => {
          const div = L.DomUtil.create("div");
          div.innerHTML = createLegendHTML(breaks, metric);
          return div;
        };
        legend.addTo(mapRef.current!);
        legendRef.current = legend;
      })
      .catch((err) => console.error("Error loading kecamatan.geojson:", err));

    // 2) Desa
    fetch("/desa.geojson")
      .then((res) => res.json())
      .then((geo) => {
        const vals: number[] = [];
        (geo.features || []).forEach((f: any) => {
          const code: string = f.properties?.WADMKD;
          const rec = dummyDesa[code];
          const v = valueFor(rec, metric);
          vals.push(v);
        });

        const breaks = quantileBreaks(vals.filter((v) => v !== undefined && !Number.isNaN(v)), 5);

        const g = L.geoJSON(geo, {
          style: (feature) => {
            const code: string = feature.properties?.WADMKD;
            const rec = dummyDesa[code];
            const v = valueFor(rec, metric);
            const color = getColorFor(v, breaks);
            return {
              color: "#444",
              weight: 0.8,
              fillColor: color,
              fillOpacity: 0.7,
            } as L.PathOptions;
          },
          onEachFeature: (feature, layer) => {
            const code: string = feature.properties?.WADMKD;
            const name: string = feature.properties?.WADMKD ?? "Unknown";
            const kecName: string = feature.properties?.WADMKC ?? "-";
            const rec = dummyDesa[code];
            const v = valueFor(rec, metric);
            const valueLabel = metric === "jumlah" ? `${rec?.jumlah ?? 0}` : `${Math.round((v + Number.EPSILON) * 10) / 10}`;
            layer.bindTooltip(`Desa: ${name}`, { sticky: true });
            layer.bindPopup(
              `<b>Desa:</b> ${name}<br/><b>Kecamatan:</b> ${kecName}<br/><b>${
                metric === "jumlah" ? "Jumlah PKH" : "PKH/1000"
              }:</b> ${valueLabel}`
            );

            layer.on("mouseover", () => {
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 2,
                  color: "#FFFF00",
                  fillOpacity: 0.95,
                });
              }
            });
            layer.on("mouseout", () => {
              if (layer instanceof L.Path) {
                const rec2 = dummyDesa[feature.properties?.WADMKD];
                const v2 = valueFor(rec2, metric);
                const color2 = getColorFor(v2, breaks);
                layer.setStyle({
                  weight: 0.8,
                  color: "#444",
                  fillColor: color2,
                  fillOpacity: 0.7,
                });
              }
            });
          },
        });

        desaLayerRef.current = g;
        // desa tidak ditambahkan otomatis; user bisa toggle dari control
        // but we also need layer control: we'll add after both may be created
      })
      .catch((err) => console.error("Error loading desa.geojson:", err));

    // add layer control after a small timeout to let layers exist (simple approach)
    // (Alternatively, we could create control after both fetches complete)
    setTimeout(() => {
      if (!mapRef.current) return;
      const overlays: Record<string, L.Layer> = {};
      if (desaLayerRef.current) overlays["Batas Desa (choropleth)"] = desaLayerRef.current;
      if (kecLayerRef.current) overlays["Batas Kecamatan (choropleth)"] = kecLayerRef.current;
      // create control and add (remove existing control if any)
      L.control.layers({}, overlays, { collapsed: false }).addTo(mapRef.current);
    }, 700);

  }, [metric]); // rerun when metric changes

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map("map").setView([-6.54, 107.45], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);
  }, []);

  // Simple control UI (positioned absolute)
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div id="map" style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "white",
          padding: 8,
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <b>Indikator:</b>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="radio"
              name="metric"
              checked={metric === "per1000"}
              onChange={() => setMetric("per1000")}
            />{" "}
            PKH per 1000 penduduk
          </label>
          <label style={{ display: "block" }}>
            <input
              type="radio"
              name="metric"
              checked={metric === "jumlah"}
              onChange={() => setMetric("jumlah")}
            />{" "}
            Jumlah Penerima (mentah)
          </label>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
          <div><b>Catatan:</b></div>
          <div>- Data PKH di-embed sebagai dummy untuk demonstrasi.</div>
          <div>- Pastikan kode pada GeoJSON cocok dengan dummy (WADMKC / WADMKD)</div>
        </div>
      </div>
    </div>
  );
}
