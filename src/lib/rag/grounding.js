/**
 * RAG step 5 — Grounding.
 * Maps each AI-generated activity back to a retrieved place: first by the cited id
 * ("place_id": "P7"), then by fuzzy name matching. Grounded activities get the place's
 * real coordinates and source links; anything unmatched is marked unverified.
 */

const PERIODS = ["morning", "afternoon", "evening"];

// Words too generic to identify a place on their own.
const GENERIC = new Set(
  "beach temple church fort restaurant cafe bar market museum park garden lake falls waterfall palace road street the and goa india new old north south east west central house hotel bay island hill point view".split(" ")
);

const words = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w.length > 1);

export function normalizeRef(raw) {
  const m = /P\s*-?\s*(\d+)/i.exec(String(raw ?? ""));
  return m ? `P${Number(m[1])}` : null;
}

/** Best place whose distinctive name words all appear in the activity's text. */
export function fuzzyMatch(activity, places) {
  const text = new Set(words(`${activity.activity} ${activity.location}`));
  let best = null;
  for (const p of places) {
    const nameWords = words(p.name);
    const distinctive = nameWords.filter((w) => !GENERIC.has(w));
    if (!distinctive.length || !nameWords.every((w) => text.has(w) || GENERIC.has(w))) continue;
    if (!distinctive.every((w) => text.has(w))) continue;
    if (!best || nameWords.length > words(best.name).length) best = p;
  }
  return best;
}

const MEAL = /\b(breakfast|brunch|lunch|dinner|supper|meal|thali|eat|eating|dine|dining|restaurant|food tour|street food)\b/i;
const EATERIES = new Set(["food", "nightlife"]);

/** Grounds one activity against the retrieval context `{ places, byId }`. */
export function groundActivity(activity, ctx) {
  if (!activity) return activity;
  const { place_id: cited, ...rest } = activity;
  let place = ctx.byId[normalizeRef(cited)];
  let match = "cited";
  if (!place) {
    place = fuzzyMatch(rest, ctx.places);
    match = "name";
  }
  if (!place) return { ...rest, verified: false };
  // A meal "near" a church is not the church: keep the location for the map, but don't claim
  // the eatery itself was verified.
  if (MEAL.test(rest.activity || "") && !EATERIES.has(place.category) && place.kind !== "market") {
    return { ...rest, lat: place.lat, lng: place.lng, verified: false, near: { name: place.name, type: place.label } };
  }
  return {
    ...rest,
    location: rest.location || place.name,
    lat: place.lat,
    lng: place.lng,
    outdoor: typeof rest.outdoor === "boolean" ? rest.outdoor : place.outdoor,
    verified: true,
    place: {
      id: place.id,
      name: place.name,
      type: place.label,
      source: place.source,
      osm_url: place.source === "osm" ? place.url : place.osm_url || null,
      wikipedia_url: place.wikipedia_url || (place.source === "wikipedia" ? place.url : null),
      match,
    },
  };
}

/** Grounds a whole itinerary and attaches provenance stats under `itinerary.rag`. */
export function groundItinerary(itinerary, ctx) {
  let total = 0;
  let grounded = 0;
  const used = new Map();
  const days = (itinerary.days || []).map((day) => {
    const next = { ...day };
    for (const p of PERIODS) {
      if (!day[p]) continue;
      total++;
      const g = groundActivity(day[p], ctx);
      next[p] = g;
      if (g.verified) {
        grounded++;
        used.set(g.place.id, g.place);
      }
    }
    return next;
  });
  return {
    ...itinerary,
    days,
    rag: {
      used: true,
      retrieved: ctx.stats.retrieved,
      context: ctx.places.length,
      knowledge: ctx.stats.sources,
      grounded,
      total,
      weather: ctx.weather ? (ctx.weather.days.some((d) => d.source === "forecast") ? "forecast" : "typical") : null,
      sources: [...used.values()],
      generated_at: new Date().toISOString(),
    },
  };
}
