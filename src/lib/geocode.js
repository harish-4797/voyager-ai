/**
 * Place lookup for itinerary activities via OpenStreetMap Nominatim.
 * Nominatim's usage policy allows ~1 request/second, so lookups go through a serial
 * queue and every result (including misses) is cached permanently in localStorage.
 */
import { CITIES } from "@/lib/cities";

const CACHE_KEY = "voyager_geocode_cache";
const MIN_INTERVAL_MS = 1100;
const DEFAULT_RADIUS_KM = 60;

let queue = Promise.resolve();
let lastRequest = 0;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeCache(key, value) {
  try {
    const cache = readCache();
    cache[key] = value;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* best-effort */
  }
}

export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function cityArea(cityName) {
  const city = CITIES.find((c) => c.name === cityName);
  return city ? { lat: city.lat, lng: city.lng, radiusKm: city.radiusKm || DEFAULT_RADIUS_KM } : null;
}

/** True when a coordinate is plausible for the trip's city. */
export function isNearCity(point, cityName) {
  if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return false;
  const area = cityArea(cityName);
  return area ? distanceKm(area, point) <= area.radiusKm : true;
}

async function nominatim(params) {
  const wait = Math.max(0, lastRequest + MIN_INTERVAL_MS - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&${params}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const [hit] = await res.json();
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

/** Resolves an activity location within a city. Returns {lat,lng} or null. */
export function geocodePlace(location, cityName) {
  const key = `${location}|${cityName}`.toLowerCase();
  const cache = readCache();
  if (key in cache) return Promise.resolve(cache[key]);

  const area = cityArea(cityName);
  const run = async () => {
    const again = readCache();
    if (key in again) return again[key];
    let params = `q=${encodeURIComponent(`${location}, ${cityName}`)}&countrycodes=in`;
    if (area) {
      const d = area.radiusKm / 111;
      params += `&viewbox=${area.lng - d},${area.lat + d},${area.lng + d},${area.lat - d}&bounded=1`;
    }
    let point = await nominatim(params);
    // Fallback: the location name alone, still bounded to the city area.
    if (!point && area) point = await nominatim(`q=${encodeURIComponent(location)}${params.slice(params.indexOf("&countrycodes"))}`);
    const value = point && isNearCity(point, cityName) ? point : null;
    writeCache(key, value);
    return value;
  };

  const result = queue.then(run, run);
  queue = result.catch(() => null);
  return result;
}
