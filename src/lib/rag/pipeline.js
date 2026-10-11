/**
 * RAG pipeline orchestration: retrieve → rank → enrich → (weather) → context for the prompt.
 * Generation and grounding live in lib/itinerary.js, which uses these helpers.
 */
import { CITIES } from "@/lib/cities";
import { getCityCoords, getTripWeather, parseISODate } from "@/lib/weather";
import { categoriesFor, enrichWithWikipedia, fetchPlaces } from "@/lib/rag/places";
import { rankPlaces, selectContext } from "@/lib/rag/ranking";

export { groundActivity, groundItinerary } from "@/lib/rag/grounding";

/** Pipeline stages reported to the UI via `onStage(stage, info)`. */
export const RAG_STAGES = ["retrieve", "rank", "enrich", "weather", "generate", "ground"];

export async function cityAreaFor(cityName) {
  const city = CITIES.find((c) => c.name === cityName);
  if (city) return { name: city.name, lat: city.lat, lng: city.lng, radiusKm: city.radiusKm, anchors: city.anchors };
  const coords = await getCityCoords(cityName);
  return coords ? { name: cityName, ...coords, radiusKm: 30 } : null;
}

/** Rough location of a place relative to the city centre, e.g. "18 km NW". Helps the model cluster days. */
function zoneOf(area, p) {
  const dLat = (p.lat - area.lat) * 111;
  const dLng = (p.lng - area.lng) * 111 * Math.cos((area.lat * Math.PI) / 180);
  const dist = Math.hypot(dLat, dLng);
  if (dist < 3) return "central";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return `${Math.round(dist)} km ${dirs[Math.round(((angle + 360) % 360) / 45) % 8]}`;
}

/**
 * Retrieves and ranks real places (and optionally weather) for a request.
 * @returns {Promise<{area, places, byId, weather, stats}>} places carry prompt refs P1…Pk
 */
export async function retrieveContext({
  city,
  interests = [],
  prefs = null,
  hint = "",
  period = null,
  near = null,
  exclude = [],
  k = 40,
  trip = null,
  onStage,
}) {
  const area = await cityAreaFor(city);
  if (!area) throw new Error(`Couldn't locate ${city}`);

  onStage?.("retrieve", { city });
  const categories = categoriesFor(interests, hint);
  const { docs, sources } = await fetchPlaces(area, categories);
  if (!docs.length) throw new Error("No places retrieved");

  onStage?.("rank", { count: docs.length });
  const ranked = rankPlaces(docs, { interests, prefs, hint, period, categories, near, exclude });
  // Full itineraries get a balanced mix across interests; swaps rank purely for the hint/slot/proximity.
  const balanced = !hint && !near;
  const places = selectContext(ranked, { k, categories: balanced ? categories : null }).map((p, i) => ({
    ...p,
    ref: `P${i + 1}`,
    zone: zoneOf(area, p),
  }));

  onStage?.("enrich", { count: places.length });
  await enrichWithWikipedia(places, k >= 30 ? 12 : 6);

  let weather = null;
  if (trip) {
    onStage?.("weather", { month: trip.month });
    weather = await getTripWeather(trip).catch(() => null);
  }

  return {
    area,
    places,
    byId: Object.fromEntries(places.map((p) => [p.ref, p])),
    weather,
    stats: { retrieved: docs.length, selected: places.length, sources },
  };
}

/** Formats the retrieved places as numbered context lines for the prompt. */
export function formatPlaces(places) {
  return places
    .map((p) => {
      const details = [p.label, p.zone];
      const note = p.wiki_extract || p.description;
      return `[${p.ref}] ${p.name} — ${details.filter(Boolean).join(" · ")}${note ? ` — ${note}` : ""}`;
    })
    .join("\n");
}

/** Formats per-day weather for the prompt. */
export function formatWeather(weather) {
  if (!weather?.days?.length) return "";
  const kind = weather.days.some((d) => d.source === "forecast") ? "forecast" : "typical for these dates (last 3 years)";
  const lines = weather.days.map((d, i) => {
    const date = weather.hasRealDates ? ` (${parseISODate(d.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })})` : "";
    const temp = typeof d.tmax === "number" ? `${Math.round(d.tmax)}°/${Math.round(d.tmin)}°C` : "n/a";
    return `Day ${i + 1}${date}: ${temp}, ${d.rainy ? `RAIN LIKELY (${(d.precip || 0).toFixed(0)} mm)` : "mostly dry"}`;
  });
  return `Weather — ${kind}:\n${lines.join("\n")}`;
}
