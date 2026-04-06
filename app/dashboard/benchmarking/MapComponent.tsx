"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRatingColor } from "@/lib/rating-colors";

export type MapHotel = {
  name: string;
  avg_rating: number | null;
  total_reviews: number;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_url?: string | null;
};

export type MapCompetitor = {
  id: string;
  name: string;
  avg_rating: number | null;
  total_reviews: number;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_url?: string | null;
};

const DEFAULT_CENTER: [number, number] = [-7.7900488, 110.3620332];

export function getCompetitorCoords(c: MapCompetitor): [number, number] | null {
  if (
    c.latitude != null &&
    c.longitude != null &&
    !Number.isNaN(c.latitude) &&
    !Number.isNaN(c.longitude)
  ) {
    return [c.latitude, c.longitude];
  }
  const match = c.google_url?.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) return [parseFloat(match[1]!), parseFloat(match[2]!)];
  return null;
}

function MapResize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = window.setTimeout(() => map.invalidateSize(), 250);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function FitBounds({
  myHotel,
  competitors,
}: {
  myHotel: MapHotel;
  competitors: MapCompetitor[];
}) {
  const map = useMap();
  useEffect(() => {
    const markers: [number, number][] = [];
    if (
      myHotel.latitude != null &&
      myHotel.longitude != null &&
      !Number.isNaN(myHotel.latitude + myHotel.longitude)
    ) {
      markers.push([myHotel.latitude, myHotel.longitude]);
    }
    for (const c of competitors) {
      const p = getCompetitorCoords(c);
      if (p) markers.push(p);
    }
    if (markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers), { padding: [60, 60] });
    }
  }, [map, myHotel, competitors]);
  return null;
}

function myHotelIcon(hotel: MapHotel) {
  const label =
    hotel.avg_rating != null && !Number.isNaN(hotel.avg_rating)
      ? hotel.avg_rating.toFixed(1)
      : "?";
  return L.divIcon({
    html: `<div style="
    background: #6366f1;
    color: white;
    border: 3px solid white;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 4px 16px rgba(99,102,241,0.5);
    cursor: pointer;
  ">${label}</div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });
}

function competitorIcon(rating: number | null) {
  const color = rating != null && !Number.isNaN(rating) ? getRatingColor(rating) : "#64748b";
  const label =
    rating != null && !Number.isNaN(rating) ? rating.toFixed(1) : "?";
  return L.divIcon({
    html: `<div style="
    background: ${color};
    color: white;
    border: 3px solid white;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    cursor: pointer;
  ">${label}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

type MapComponentProps = {
  center?: [number, number];
  zoom?: number;
  myHotel: MapHotel;
  competitors: MapCompetitor[];
  height: number;
};

export default function MapComponent({
  center = DEFAULT_CENTER,
  zoom = 14,
  myHotel,
  competitors,
  height,
}: MapComponentProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  const mapCenter: [number, number] = center;
  const mapZoom = zoom;

  const hasHotelCoords =
    myHotel.latitude != null &&
    myHotel.longitude != null &&
    !Number.isNaN(myHotel.latitude) &&
    !Number.isNaN(myHotel.longitude);

  const myRating = myHotel.avg_rating;
  const myReviewsLabel = myHotel.total_reviews.toLocaleString();

  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius: 20, overflow: "hidden" }}>
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <MapResize />
        <FitBounds myHotel={myHotel} competitors={competitors} />
        <TileLayer
          attribution="© OpenStreetMap © CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {hasHotelCoords ? (
          <Marker position={[myHotel.latitude!, myHotel.longitude!]} icon={myHotelIcon(myHotel)}>
            <Popup>
              <div style={{ fontFamily: "sans-serif", minWidth: 160 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 4,
                    color: "#6366f1",
                  }}
                >
                  ★ YOUR HOTEL
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{myHotel.name}</div>
                <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                  ⭐ {myRating ?? "—"} · {myReviewsLabel} reviews
                </div>
                {myHotel.address ? (
                  <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{myHotel.address}</div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ) : null}
        {competitors.map((c) => {
          const pos = getCompetitorCoords(c);
          if (!pos) return null;
          const cr = c.avg_rating;
          const badgeOk =
            typeof cr === "number" &&
            !Number.isNaN(cr) &&
            typeof myRating === "number" &&
            !Number.isNaN(myRating);
          return (
            <Marker key={c.id} position={pos} icon={competitorIcon(c.avg_rating)}>
              <Popup>
                <div style={{ fontFamily: "sans-serif", minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                    ⭐ {cr ?? "Not synced"}{" "}
                    {c.total_reviews ? `· ${c.total_reviews.toLocaleString()} reviews` : ""}
                  </div>
                  {c.address ? (
                    <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{c.address}</div>
                  ) : null}
                  {badgeOk ? (
                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          background: getRatingColor(cr as number),
                          color: "white",
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 100,
                          fontWeight: 600,
                        }}
                      >
                        {(cr as number) >= (myRating as number) ? "↑ Rated higher" : "↓ Rated lower"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          left: 12,
          bottom: 12,
          fontSize: 11,
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          pointerEvents: "none",
        }}
      >
        <div>
          <span style={{ color: "#6366f1" }}>●</span> Your hotel (indigo)
        </div>
        <div>
          <span style={{ color: "#22c55e" }}>●</span> 4.5+
        </div>
        <div>
          <span style={{ color: "#84cc16" }}>●</span> 4.0–4.5
        </div>
        <div>
          <span style={{ color: "#f59e0b" }}>●</span> 3.5–4.0
        </div>
        <div>
          <span style={{ color: "#ef4444" }}>●</span> Below 3.5
        </div>
      </div>
    </div>
  );
}
