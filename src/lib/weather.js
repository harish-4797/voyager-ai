/**
 * Weather via Open-Meteo (free, no API key).
 *  - Real forecast for trip days within the next 16 days.
 *  - Otherwise "typical" weather: the same calendar dates averaged over the past 3 years.
 * Responses are cached in localStorage.
 */
import { CITIES, MONTHS } from "@/lib/cities";

const FORECAST_WINDOW_DAYS = 16;
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const HOUR = 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISODate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

function cacheGet(key) {
  try {
    const hit = JSON.parse(localStorage.getItem(key));
    if (hit && hit.expires > Date.now()) return hit.value;
  } catch {
    /* ignore */
  }
  return null;
}

function cacheSet(key, value, ttl) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + ttl }));
  } catch {
    /* storage full or unavailable — caching is best-effort */
  }
}

export async function getCityCoords(cityName) {
  const known = CITIES.find((c) => c.name === cityName);
  if (known) return { lat: known.lat, lng: known.lng };
  const key = `wx:geo:${cityName}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`);
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) return null;
  const coords = { lat: hit.latitude, lng: hit.longitude };
  cacheSet(key, coords, 365 * 24 * HOUR);
  return coords;
}

async function fetchDaily(kind, { lat, lng }, start, end) {
  const key = `wx:${kind}:${lat.toFixed(3)},${lng.toFixed(3)}:${start}:${end}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const base = kind === "forecast" ? "https://api.open-meteo.com/v1/forecast" : "https://archive-api.open-meteo.com/v1/archive";
  const daily = ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum"];
  if (kind === "forecast") daily.push("precipitation_probability_max");
  const url = `${base}?latitude=${lat}&longitude=${lng}&daily=${daily.join(",")}&timezone=auto&start_date=${start}&end_date=${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = (await res.json()).daily;
  cacheSet(key, data, kind === "forecast" ? 3 * HOUR : 30 * 24 * HOUR);
  return data;
}

/** First day of the trip: the chosen start date, or the 1st of the trip month (next occurrence). */
export function tripStartDate(trip) {
  if (trip?.start_date) return parseISODate(trip.start_date);
  const m = MONTHS.indexOf(trip?.month);
  if (m < 0) return null;
  const today = startOfToday();
  const year = m < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
  return new Date(year, m, 1);
}

/**
 * Weather for each trip day: { date, source: "forecast" | "typical", tmax, tmin, precip, rainChance?, code, rainy }.
 * `date` is only meaningful when the trip has a real start date.
 */
export async function getTripWeather(trip) {
  const coords = await getCityCoords(trip.city);
  const start = tripStartDate(trip);
  if (!coords || !start || !trip.days) return null;

  const dates = Array.from({ length: trip.days }, (_, i) => addDays(start, i));
  const result = dates.map((d) => ({ date: toISODate(d), source: null }));

  // 1. Real forecast for days inside the forecast window.
  if (trip.start_date) {
    const today = startOfToday();
    const last = addDays(today, FORECAST_WINDOW_DAYS - 1);
    const inWindow = dates.map((d, i) => (d >= today && d <= last ? i : -1)).filter((i) => i >= 0);
    if (inWindow.length) {
      const f = await fetchDaily("forecast", coords, result[inWindow[0]].date, result[inWindow[inWindow.length - 1]].date);
      for (const i of inWindow) {
        const k = f.time.indexOf(result[i].date);
        if (k < 0) continue;
        const precip = f.precipitation_sum[k] ?? 0;
        const rainChance = f.precipitation_probability_max?.[k] ?? null;
        const code = f.weather_code[k];
        result[i] = {
          ...result[i],
          source: "forecast",
          tmax: f.temperature_2m_max[k],
          tmin: f.temperature_2m_min[k],
          precip,
          rainChance,
          code,
          rainy: precip >= 4 || (rainChance ?? 0) >= 60 || RAIN_CODES.has(code),
        };
      }
    }
  }

  // 2. Typical weather (past 3 years, same dates) for everything else.
  const missing = result.map((r, i) => (r.source ? -1 : i)).filter((i) => i >= 0);
  if (missing.length) {
    const thisYear = startOfToday().getFullYear();
    const years = [1, 2, 3].map((k) => thisYear - k);
    const series = await Promise.all(
      years.map((year) => {
        const s = new Date(year, start.getMonth(), start.getDate());
        return fetchDaily("archive", coords, toISODate(s), toISODate(addDays(s, trip.days - 1))).catch(() => null);
      })
    );
    const valid = series.filter(Boolean);
    for (const i of missing) {
      const avg = (field) => {
        const vals = valid.map((s) => s[field]?.[i]).filter((v) => typeof v === "number");
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      const precip = avg("precipitation_sum") ?? 0;
      const rainyYears = valid.filter((s) => (s.precipitation_sum?.[i] ?? 0) >= 2.5).length;
      const rainy = precip >= 4 || rainyYears >= 2;
      const anyWet = valid.some((s) => RAIN_CODES.has(s.weather_code?.[i]));
      result[i] = {
        ...result[i],
        source: "typical",
        tmax: avg("temperature_2m_max"),
        tmin: avg("temperature_2m_min"),
        precip,
        code: rainy ? 63 : anyWet ? 2 : 1,
        rainy,
      };
    }
  }

  return { days: result, hasRealDates: Boolean(trip.start_date) };
}

/** Typical conditions for a whole month, averaged over the last two years. */
export async function getMonthClimate(cityName, monthIndex) {
  const coords = await getCityCoords(cityName);
  if (!coords) return null;
  const thisYear = startOfToday().getFullYear();
  const months = await Promise.all(
    [1, 2].map((k) => {
      const year = thisYear - k;
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      return fetchDaily("archive", coords, toISODate(start), toISODate(end)).catch(() => null);
    })
  );
  const valid = months.filter(Boolean);
  if (!valid.length) return null;
  const mean = (arrs) => {
    const vals = arrs.flat().filter((v) => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  return {
    tmax: mean(valid.map((m) => m.temperature_2m_max)),
    tmin: mean(valid.map((m) => m.temperature_2m_min)),
    rainyDays: valid.reduce((sum, m) => sum + m.precipitation_sum.filter((p) => p >= 1).length, 0) / valid.length,
  };
}

/** Coarse weather category for icons/labels. */
export function weatherKind(code) {
  if (code == null) return "unknown";
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (RAIN_CODES.has(code)) return "rain";
  return "partly";
}
