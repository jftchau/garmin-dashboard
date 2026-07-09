import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RunMap({ polyline, height = 260 }) {
  if (!polyline || polyline.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-surface-2 rounded text-muted text-sm font-mono"
        style={{ height }}
      >
        No GPS track for this run
      </div>
    );
  }

  const center = polyline[Math.floor(polyline.length / 2)];

  return (
    <div className="rounded overflow-hidden border border-line" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Polyline positions={polyline} pathOptions={{ color: "#f5c518", weight: 4 }} />
      </MapContainer>
    </div>
  );
}
