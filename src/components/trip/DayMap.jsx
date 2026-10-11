import React, { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { useInView } from "framer-motion";
import { Loader2, MapPinOff, Navigation } from "lucide-react";
import { PERIODS } from "@/lib/itinerary";
import { cityArea, geocodePlace, isNearCity } from "@/lib/geocode";

export const PERIOD_COLORS = { morning: "#FFB627", afternoon: "#FF6A2B", evening: "#127F8C" };
const PERIOD_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

function pinIcon(number, color) {
  return L.divIcon({
    className: "",
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -38],
    html: `<div style="position:relative;width:34px;height:42px">
      <div style="position:absolute;left:2px;top:0;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff;box-shadow:0 6px 14px rgba(18,20,31,.35)"></div>
      <span style="position:absolute;left:0;top:5px;width:34px;text-align:center;font:700 13px/20px Inter,sans-serif;color:#fff">${number}</span>
    </div>`,
  });
}

function FitToStops({ points, fallback }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (points.length >= 2) map.fitBounds(points, { padding: [56, 56], maxZoom: 15 });
      else if (points.length === 1) map.setView(points[0], 14);
      else if (fallback) map.setView(fallback, 12);
    };
    fit();
    // Re-fit once the container has its final size (e.g. after the show/hide animation).
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Map of one day's stops. Activities without trustworthy coordinates are geocoded and
 * reported through `onResolve(period, {lat, lng}, activityName)` so they can be saved with the trip.
 */
export default function DayMap({ day, city, onResolve }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "200px" });
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState([]);

  const stops = useMemo(
    () =>
      PERIODS.map((period, i) => ({ period, number: i + 1, activity: day[period] }))
        .filter((s) => s.activity)
        .map((s) => ({ ...s, valid: isNearCity(s.activity, city) })),
    [day, city]
  );

  const unresolvedKey = stops.filter((s) => !s.valid).map((s) => `${s.period}:${s.activity.location || s.activity.activity}`).join("|");

  useEffect(() => {
    if (!inView) return;
    const missing = stops.filter((s) => !s.valid);
    if (!missing.length) return;
    let cancelled = false;
    setPending(missing.length);
    setFailed([]);
    missing.forEach(async (stop) => {
      try {
        const point = await geocodePlace(stop.activity.location || stop.activity.activity, city);
        if (cancelled) return;
        if (point) onResolve?.(stop.period, point, stop.activity.activity);
        else setFailed((f) => [...f, stop.period]);
      } catch {
        if (!cancelled) setFailed((f) => [...f, stop.period]);
      } finally {
        if (!cancelled) setPending((n) => n - 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inView, unresolvedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const placed = stops.filter((s) => s.valid);
  const points = placed.map((s) => [s.activity.lat, s.activity.lng]);
  const area = cityArea(city);
  const fallback = area ? [area.lat, area.lng] : points[0];

  const directionsUrl = `https://www.google.com/maps/dir/${stops
    .map((s) => (s.valid ? `${s.activity.lat},${s.activity.lng}` : encodeURIComponent(`${s.activity.location || s.activity.activity}, ${city}`)))
    .join("/")}`;

  return (
    <div ref={ref} className="relative isolate overflow-hidden rounded-2xl border border-ink/[0.06] bg-secondary/60">
      <div className="h-64 sm:h-72">
        {inView && (fallback || points.length) ? (
          <MapContainer
            center={points[0] || fallback}
            zoom={12}
            scrollWheelZoom={false}
            dragging={!L.Browser.mobile}
            zoomControl={false}
            className="voyager-map h-full w-full"
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <ZoomControl position="bottomright" />
            {points.length >= 2 && (
              <Polyline positions={points} pathOptions={{ color: "#12141F", weight: 3, opacity: 0.7, dashArray: "8 10", lineCap: "round" }} />
            )}
            {placed.map((s) => (
              <Marker key={s.period} position={[s.activity.lat, s.activity.lng]} icon={pinIcon(s.number, PERIOD_COLORS[s.period])}>
                <Popup>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: PERIOD_COLORS[s.period], textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {PERIOD_LABELS[s.period]}
                  </p>
                  <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{s.activity.activity}</p>
                  {s.activity.location && <p style={{ margin: 0, color: "#666" }}>{s.activity.location}</p>}
                </Popup>
              </Marker>
            ))}
            <FitToStops points={points} fallback={fallback} />
          </MapContainer>
        ) : (
          <div className="skeleton h-full w-full" />
        )}
      </div>

      {/* Overlay controls */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          {stops.map((s) => (
            <span key={s.period} className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-soft backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PERIOD_COLORS[s.period] }} />
              {s.number}. {PERIOD_LABELS[s.period]}
            </span>
          ))}
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white shadow-lift transition hover:bg-sunset"
        >
          <Navigation className="h-3 w-3" /> Directions
        </a>
      </div>
      {(pending > 0 || failed.length > 0) && (
        <div className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-ink/70 shadow-soft backdrop-blur">
          {pending > 0 ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Locating {pending} place{pending > 1 ? "s" : ""}…
            </>
          ) : (
            <>
              <MapPinOff className="h-3 w-3" /> Couldn't pin {failed.length} place{failed.length > 1 ? "s" : ""}
            </>
          )}
        </div>
      )}
    </div>
  );
}
