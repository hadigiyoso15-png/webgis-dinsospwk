"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Hal penting:
 * - Pastikan public/desa.geojson & public/kecamatan.geojson tersedia.
 * - GeoJSON harus punya attribute:
 * - Kecamatan: feature.properties.WADMKC
 * - Desa: feature.properties.WADMKD dan (opsional) WADMKC
 */

// ====== DEFINISI TYPE ======
type PKHRecord = {
  jumlah: number; // jumlah penerima
  penduduk: number; // total penduduk
};

type Warga = {
  nik: string;
  nama: string;
  alamat: string;
};

export default function HomePage() {
  const mapRef = useRef<L.Map | null>(null);
  const desaLayerRef = useRef<L.GeoJSON | null>(null);
  const kecLayerRef = useRef<L.GeoJSON | null>(null);
  const legendRef = useRef<L.Control | null>(null);

  // UI state
  const [metric, setMetric] = useState<"jumlah" | "per1000">("per1000");
  
  // STATE BARU: Untuk menyimpan data warga yang akan ditampilkan di tabel
  const [selectedWarga, setSelectedWarga] = useState<Warga[]>([]);
  const [selectedWilayah, setSelectedWilayah] = useState<string | null>(null);


  // ====== Dummy PKH data (KECAMATAN) ======
  const dummyKecamatan: Record<string, PKHRecord> = {
    "Purwakarta": { jumlah: 8500, penduduk: 130000 },
    "Campaka": { jumlah: 4200, penduduk: 55000 },
    "Jatiluhur": { jumlah: 3100, penduduk: 62000 },
    "Pasawahan": { jumlah: 2800, penduduk: 45000 },
    "Babakancikao": { jumlah: 2500, penduduk: 51000 },
    "Plered": { jumlah: 5100, penduduk: 78000 },
    "Sukasari": { jumlah: 1200, penduduk: 15000 }, // Rasio tinggi
    "Wanayasa": { jumlah: 2300, penduduk: 41000 },
    "Kiarapedes": { jumlah: 1800, penduduk: 31000 },
    "Bojong": { jumlah: 2600, penduduk: 48000 },
    "Tegalwaru": { jumlah: 3300, penduduk: 52000 },
    "Maniis": { jumlah: 1400, penduduk: 29000 },
    "Darangdan": { jumlah: 3900, penduduk: 67000 },
    "Sukatani": { jumlah: 4100, penduduk: 71000 },
    "Pondoksalam": { jumlah: 1300, penduduk: 26000 },
    "Bungursari": { jumlah: 2900, penduduk: 53000 }, // Rasio rendah
    "Cibatu": { jumlah: 2100, penduduk: 34000 },
  };

  // ====== Dummy PKH data (DESA) ======
  const dummyDesa: Record<string, PKHRecord> = {
    // (dari Kec. Purwakarta)
    "Nagri Kidul": { jumlah: 650, penduduk: 11500 },
    "Nagri Kaler": { jumlah: 710, penduduk: 12200 },
    "Ciseureuh": { jumlah: 900, penduduk: 15000 },
    "Sindangkasih": { jumlah: 550, penduduk: 11000 },
    "Tegalmunjul": { jumlah: 400, penduduk: 7000 },
    "Cipaisan": { jumlah: 210, penduduk: 4500 },
    "Purwamekar": { jumlah: 350, penduduk: 6200 },
    // (dari Kec. Campaka)
    "Campaka": { jumlah: 350, penduduk: 4500 },
    "Cikumpay": { jumlah: 420, penduduk: 5100 },
    "Cirende": { jumlah: 280, penduduk: 3900 },
    // (dari Kec. Jatiluhur)
    "Jatiluhur": { jumlah: 280, penduduk: 6000 }, 
    "Bunder": { jumlah: 350, penduduk: 7200 },
    "Kembangkuning": { jumlah: 210, penduduk: 4100 },
    // (dari Kec. Pasawahan)
    "Pasawahan": { jumlah: 220, penduduk: 3800 },
    "Selaawi": { jumlah: 400, penduduk: 4100 },
    "Cihuni": { jumlah: 150, penduduk: 2900 },
    // (dari Kec. Plered)
    "Plered": { jumlah: 380, penduduk: 6500 },
    "Anjun": { jumlah: 310, penduduk: 5300 },
    "Linggarsari": { jumlah: 450, penduduk: 7100 },
    // (dari Kec. Sukasari)
    "Sukasari": { jumlah: 250, penduduk: 2100 }, 
    "Kertamanah": { jumlah: 280, penduduk: 2500 },
    "Parungbanteng": { jumlah: 150, penduduk: 1900 },
  };

  // ====== DATA DUMMY BARU: Daftar Masyarakat per Desa ======
  // Kunci (key) harus sama dengan WADMKD di geojson / dummyDesa
  const dummyMasyarakat: Record<string, Warga[]> = {
    "Nagri Kidul": [
      { nik: "321401...", nama: "Budi Santoso", alamat: "Jl. Mawar No. 10" },
      { nik: "321401...", nama: "Siti Aminah", alamat: "Gg. Melati III No. 5" },
      { nik: "321401...", nama: "Ahmad Dahlan", alamat: "Jl. Kenanga No. 1" },
    ],
    "Ciseureuh": [
      { nik: "321401...", nama: "Rahmat Hidayat", alamat: "Jl. Industri No. 20" },
      { nik: "321401...", nama: "Dewi Lestari", alamat: "Jl. Industri No. 22" },
      { nik: "321401...", nama: "Eka Permana", alamat: "Jl. Baru No. 8" },
      { nik: "321401...", nama: "Lia Fajarwati", alamat: "Jl. Baru No. 9" },
    ],
    "Nagri Kaler": [
      { nik: "321401...", nama: "Putra Pratama", alamat: "Jl. Veteran No. 55" },
      { nik: "321401...", nama: "Yulia Rahman", alamat: "Jl. Veteran No. 60" },
    ],
    "Campaka": [
      { nik: "321402...", nama: "Jajang Nurjaman", alamat: "Rt 01/Rw 02" },
      { nik: "321402...", nama: "Asep Sunandar", alamat: "Rt 03/Rw 01" },
    ],
    "Sukasari": [
      { nik: "321407...", nama: "Ujang Maman", alamat: "Dusun Cibeber" },
      { nik: "321407...", nama: "Kokom Komariah", alamat: "Dusun Ciririp" },
      { nik: "321407...", nama: "Endang Suherman", alamat: "Dusun Cibeber" },
    ],
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
    // (Fungsi ini tidak berubah)
    if (breaks.length === 0) return "#fff";
    if (value > breaks[breaks.length - 1]) return "#800026";
    if (value > breaks[3]) return "#BD0026";
    if (value > breaks[2]) return "#E31A1C";
    if (value > breaks[1]) return "#FC4E2A";
    if (value > breaks[0]) return "#FD8D3C";
    return "#FFEDA0";
  }

  // Create legend control HTML
  function createLegendHTML(breaks: number[], metricChoice: "jumlah" | "per1000") {
    // (Logika fungsi ini sedikit disederhanakan untuk akurasi rentang)
    const formatter = (v: number) =>
      metricChoice === "jumlah" ? `${Math.round(v)}` : `${(Math.round(v * 10) / 10).toFixed(1)}`;
    const colors = ["#FFEDA0", "#FD8D3C", "#FC4E2A", "#E31A1C", "#BD0026", "#800026"]; // 6 warna, 5 rentang
    const ranges: string[] = [];

    if(breaks.length === 0) return "<div>Data tidak cukup untuk legenda</div>";

    // Build ranges
    ranges.push(`< ${formatter(breaks[0])}`);
    for (let i = 0; i < breaks.length - 1; i++) {
      ranges.push(`${formatter(breaks[i])} – ${formatter(breaks[i+1])}`);
    }
    ranges.push(`> ${formatter(breaks[breaks.length - 1])}`);

    // Pastikan 5 rentang (jika breaks punya 4 item)
    const finalRanges = [
      `< ${formatter(breaks[0])}`,
      `${formatter(breaks[0])} – ${formatter(breaks[1])}`,
      `${formatter(breaks[1])} – ${formatter(breaks[2])}`,
      `${formatter(breaks[2])} – ${formatter(breaks[3])}`,
      `> ${formatter(breaks[3])}`,
    ];
    
    // Build HTML
    let html = `<div style="padding:6px;font-size:12px;background:white;border-radius:4px;box-shadow:0 0 6px rgba(0,0,0,0.2)"><b>Legenda (${metricChoice === "jumlah" ? "Jumlah" : "Per 1000"})</b><br/>`;
    for (let i = 0; i < 5; i++) {
      const color = colors[i];
      const range = finalRanges[i] ?? "N/A";
      html += `<i style="background:${color};width:18px;height:12px;display:inline-block;margin-right:6px;border:1px solid #999"></i>${range}<br/>`;
    }
    html += `</div>`;
    return html;
  }

  // Rebuild layers with choropleth styling (dipanggil on init & on metric change)
  useEffect(() => {
    if (!mapRef.current) return;

    // Hapus layer dan legenda yang ada
    if (desaLayerRef.current) desaLayerRef.current.remove();
    if (kecLayerRef.current) kecLayerRef.current.remove();
    if (legendRef.current) legendRef.current.remove();
    desaLayerRef.current = null;
    kecLayerRef.current = null;
    legendRef.current = null;

    // Hapus layer control yang lama (jika ada)
    mapRef.current.eachLayer((layer) => {
      if ((layer as any)._layerControl) {
        mapRef.current?.removeControl(layer as any);
      }
    });


    // 1) Kecamatan
    fetch("/kecamatan.geojson")
      .then((res) => res.json())
      .then((geo) => {
        const vals: number[] = [];
        (geo.features || []).forEach((f: any) => {
          const code: string = f.properties?.WADMKC;
          const rec = dummyKecamatan[code];
          const v = valueFor(rec, metric);
          if (v !== 0) vals.push(v); // abaikan 0 dari perhitungan breaks
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

            // BARU: Event klik untuk kecamatan (membersihkan tabel)
            layer.on("click", () => {
              setSelectedWarga([]); // Kosongkan daftar warga
              setSelectedWilayah(`Kecamatan ${name}`); // Tampilkan nama kecamatan
            });
          },
        });

        kecLayerRef.current = g;
        g.addTo(mapRef.current!);

        // legend (gunakan breaks kecamatan)
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
           if (v !== 0) vals.push(v); // abaikan 0
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

            // mouseover
            layer.on("mouseover", () => {
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 2,
                  color: "#FFFF00",
                  fillOpacity: 0.95,
                });
              }
            });
            // mouseout
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

            // BARU: Event klik untuk desa (menampilkan daftar warga)
            layer.on("click", () => {
              const wargaList = dummyMasyarakat[code] ?? [];
              setSelectedWarga(wargaList);
              setSelectedWilayah(`Desa/Kel. ${name}`);
            });
          },
        });

        desaLayerRef.current = g;
        // Desa tidak ditambahkan by default, tapi ada di layer control
      })
      .catch((err) => console.error("Error loading desa.geojson:", err));

    // Tambahkan layer control setelah kedua fetch (mungkin) selesai
    setTimeout(() => {
      if (!mapRef.current) return;
      const overlays: Record<string, L.Layer> = {};
      if (kecLayerRef.current) overlays["Batas Kecamatan (choropleth)"] = kecLayerRef.current;
      if (desaLayerRef.current) overlays["Batas Desa (choropleth)"] = desaLayerRef.current;
      L.control.layers({}, overlays, { collapsed: false, position: 'topright' }).addTo(mapRef.current);
    }, 1000); // 1 detik timeout

  }, [metric]); // Jalankan ulang efek ini saat 'metric' berubah

  // Init map sekali saja
  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map("map").setView([-6.54, 107.45], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);
  }, []);

  // ====== PERUBAHAN LAYOUT JSX DIMULAI DI SINI ======
  return (
    // Container utama diubah menjadi flex column
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* 1. Kontainer Peta (65% tinggi layar) */}
      <div style={{ width: "100%", height: "65vh", position: "relative" }}>
        <div id="map" style={{ width: "100%", height: "100%" }} />
        
        {/* Kontrol UI (tetap di atas peta) */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 60, // digeser agar tidak tertutup layer control
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
        </div>
      </div>

      {/* 2. Kontainer Tabel (35% tinggi layar) */}
      <div 
        style={{ 
          width: "100%", 
          height: "35vh", 
          overflowY: "auto", // Biar bisa scroll jika data banyak
          borderTop: "2px solid #ccc",
          padding: "16px",
          boxSizing: "border-box" // padding tidak menambah ukuran
        }}
      >
        <h3>
          {selectedWilayah 
            ? `Daftar Penerima PKH: ${selectedWilayah}` 
            : "Silakan Klik sebuah Desa pada Peta"}
        </h3>

        {/* Tampilkan tabel HANYA jika ada warga yang dipilih */}
        {selectedWarga.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead style={{ background: "#f0f0f0" }}>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>NIK</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Nama</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Alamat</th>
              </tr>
            </thead>
            <tbody>
              {selectedWarga.map((warga) => (
                <tr key={warga.nik} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{warga.nik}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{warga.nama}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{warga.alamat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Tampilkan pesan ini jika wilayah dipilih TAPI tidak ada data warga
          selectedWilayah && <p>Data warga tidak tersedia untuk wilayah ini.</p>
        )}
      </div>
    </div>
  );
}