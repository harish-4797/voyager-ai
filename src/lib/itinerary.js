/**
 * Shared itinerary logic: a RAG pipeline for full itineraries and single-activity swaps
 * (retrieve real places → rank → augment the prompt → generate → ground), plus helpers
 * for editing an itinerary's day/period slots. Falls back to plain generation if
 * retrieval is unavailable.
 */
import { voyager } from "@/api/voyagerClient";
import { formatPlaces, formatWeather, groundActivity, groundItinerary, retrieveContext } from "@/lib/rag/pipeline";

export const PERIODS = ["morning", "afternoon", "evening"];

const ACTIVITY_SCHEMA = {
  type: "object",
  properties: {
    place_id: { type: "string" },
    activity: { type: "string" },
    location: { type: "string" },
    description: { type: "string" },
    estimated_cost: { type: "number" },
    duration: { type: "string" },
    tips: { type: "string" },
    lat: { type: "number" },
    lng: { type: "number" },
    outdoor: { type: "boolean" },
  },
};

const ITINERARY_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    estimated_budget: {
      type: "object",
      properties: {
        hotels: { type: "number" },
        food: { type: "number" },
        transport: { type: "number" },
        attractions: { type: "number" },
        misc: { type: "number" },
        total: { type: "number" },
      },
    },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "number" },
          theme: { type: "string" },
          morning: ACTIVITY_SCHEMA,
          afternoon: ACTIVITY_SCHEMA,
          evening: ACTIVITY_SCHEMA,
        },
      },
    },
  },
};

// With retrieval the model cites a place id instead of guessing coordinates.
const EXAMPLE_GROUNDED = `{ "place_id": "P3", "activity": "", "location": "", "description": "", "estimated_cost": 0, "duration": "", "tips": "", "outdoor": true }`;
const EXAMPLE_UNGROUNDED = `{ "activity": "", "location": "", "description": "", "estimated_cost": 0, "duration": "", "tips": "", "lat": 0.0, "lng": 0.0, "outdoor": true }`;

const GROUNDING_RULES = `GROUNDING RULES (very important):
- Base EVERY activity on exactly one place from RETRIEVED PLACES and set "place_id" to its id (e.g. "P7"). Use that place's name in "location".
- Do NOT invent places that are not in the list. Meals should use the listed restaurants/cafés where possible.
- Use the distances/directions (e.g. "12 km NW") to keep each day's places close together.
- Use the notes in the list for accurate descriptions; never contradict them.
- If a day is marked RAIN LIKELY, prefer indoor places (museums, churches/temples, restaurants, markets, spas) that day.`;

function personalizationContext(prefs) {
  if (!prefs) return "";
  const past = prefs.past_trips_summary?.length
    ? prefs.past_trips_summary.map((t) => `${t.city}, ${t.country} (${t.month} ${t.year})${t.notes ? ` - ${t.notes}` : ""}`).join("; ")
    : "none recorded";
  return `
PERSONALIZATION CONTEXT (use this to deeply customize the itinerary):
- Travel Style: ${prefs.travel_style?.join(", ") || "not specified"}
- Dietary Restrictions: ${prefs.dietary_restrictions?.join(", ") || "none"}
- Preferred Budget Tier: ${prefs.preferred_budget_range || "mid-range"}
- Activities to AVOID: ${prefs.avoided_activities?.join(", ") || "none"}
- Past Trips (avoid repetition, build on experiences): ${past}
`;
}

async function loadPrefs() {
  try {
    return await voyager.auth.me();
  } catch {
    return null;
  }
}

/**
 * Generates a complete itinerary with RAG. `onStage(stage, info)` reports pipeline progress:
 * retrieve → rank → enrich → weather → generate → ground.
 */
export async function generateItinerary({ city, days, month, budget, interests = [], start_date, onStage }) {
  const prefs = await loadPrefs();
  const interestList = interests.join(", ") || "sightseeing, food";
  const when = start_date ? `${month} (starting ${start_date})` : month;

  // 1–4. Retrieve, rank and enrich real places + weather.
  let ctx = null;
  try {
    ctx = await retrieveContext({ city, interests, prefs, trip: { city, days, month, start_date }, onStage });
  } catch (err) {
    console.warn("Retrieval unavailable — generating without retrieved context:", err);
  }

  const contextBlock = ctx
    ? `
RETRIEVED PLACES — real places near ${city} from Wikipedia and OpenStreetMap (id, name — type · distance from centre — notes):
${formatPlaces(ctx.places)}

${formatWeather(ctx.weather)}

${GROUNDING_RULES}
`
    : "";
  const example = ctx ? EXAMPLE_GROUNDED : EXAMPLE_UNGROUNDED;
  const fieldsRule = ctx
    ? `9. Each activity also needs "place_id" (from RETRIEVED PLACES) and "outdoor": true if mostly outdoors, false if mostly indoors`
    : `9. Each activity also needs "lat" and "lng": the real decimal-degree coordinates of that location, and "outdoor": true if the activity is mostly outdoors (beaches, treks, forts, markets, boat rides), false if mostly indoors`;

  const prompt = `You are an expert travel planner AI. Generate a detailed ${days}-day itinerary for ${city} in ${when}.
${personalizationContext(prefs)}${contextBlock}
USER PREFERENCES:
- Budget: ₹${budget} INR total
- Interests: ${interestList}
- Duration: ${days} days

REQUIREMENTS:
1. Each day must have morning, afternoon, and evening activities
2. Activities should be geographically clustered to minimize travel time
3. Include realistic Indian travel cost estimates in Indian Rupees (INR / ₹) (e.g., hotels per night, meals, local transport/cabs/scooters, and entry tickets)
4. Allocate the budget realistically to utilize roughly 80% to 95% of the total budget of ₹${budget} INR across categories (hotels, food, transport, attractions, misc), without exceeding ₹${budget} INR
5. Consider ${month} weather and seasonal events
6. Prioritize activities matching: ${interestList}
7. Include local tips for each activity
8. Each activity needs: activity name, location (a specific, searchable place name), description, estimated_cost, duration, tips
${fieldsRule}

OUTPUT: Return ONLY a valid JSON object. Every day in the "days" array must be a complete object enclosed in curly braces { and }.
Example structure:
{
  "summary": "2-3 sentence trip overview",
  "estimated_budget": { "hotels": 6000, "food": 4000, "transport": 2000, "attractions": 2000, "misc": 1000, "total": 15000 },
  "days": [
    { "day": 1, "theme": "day theme", "morning": ${example}, "afternoon": ${example}, "evening": ${example} },
    { "day": 2, "theme": "day theme", "morning": ${example}, "afternoon": ${example}, "evening": ${example} }
  ]
}`;

  // 5. Generate.
  onStage?.("generate", {});
  const raw = await voyager.integrations.Core.InvokeLLM({ prompt, response_json_schema: ITINERARY_SCHEMA });

  // 6. Ground every activity against the retrieved places.
  onStage?.("ground", {});
  return ctx ? groundItinerary(raw, ctx) : { ...raw, rag: { used: false } };
}

/** Centre point of a day's other activities that have coordinates (used to keep swaps nearby). */
function dayCentroid(day, exceptPeriod) {
  const pts = PERIODS.filter((p) => p !== exceptPeriod)
    .map((p) => day[p])
    .filter((a) => typeof a?.lat === "number" && typeof a?.lng === "number");
  if (!pts.length) return null;
  return { lat: pts.reduce((s, a) => s + a.lat, 0) / pts.length, lng: pts.reduce((s, a) => s + a.lng, 0) / pts.length };
}

/**
 * Replaces one slot using the same RAG pipeline: candidates are re-ranked for the hint, the
 * time slot and closeness to the rest of that day, then the AI picks one and we ground it.
 */
export async function suggestReplacement({ trip, dayIndex, period, hint }) {
  const prefs = await loadPrefs();
  const day = trip.itinerary.days[dayIndex];
  const current = day[period];
  const all = trip.itinerary.days.flatMap((d) => PERIODS.map((p) => d[p])).filter(Boolean);
  const taken = all.map((a) => a.activity).join("; ");

  let ctx = null;
  try {
    ctx = await retrieveContext({
      city: trip.city,
      interests: trip.interests || [],
      prefs,
      hint: hint || "",
      period,
      near: dayCentroid(day, period),
      exclude: [...all.map((a) => a.place?.id).filter(Boolean), ...all.map((a) => a.place?.name || a.location).filter(Boolean)],
      k: 15,
    });
  } catch (err) {
    console.warn("Retrieval unavailable for swap — falling back to plain generation:", err);
  }

  const contextBlock = ctx
    ? `
CANDIDATE PLACES — real places from Wikipedia/OpenStreetMap, ranked for this slot and near the day's other stops:
${formatPlaces(ctx.places)}

Pick exactly ONE candidate and set "place_id" to its id. Do not invent a place.
`
    : "";

  const prompt = `You are an expert travel planner. Suggest ONE alternative ${period} activity for Day ${day.day} ("${day.theme}") of a ${trip.days}-day trip to ${trip.city} in ${trip.month}.
${personalizationContext(prefs)}${contextBlock}
CONTEXT:
- Activity being replaced: "${current?.activity || "none"}" at ${current?.location || "unknown"} (cost ₹${current?.estimated_cost ?? 0})
- Other activities that day: ${PERIODS.filter((p) => p !== period).map((p) => day[p]?.activity).filter(Boolean).join("; ") || "none"}
- Trip interests: ${(trip.interests || []).join(", ") || "sightseeing, food"}
- Total trip budget: ₹${trip.budget} INR — keep the cost similar to the activity being replaced unless asked otherwise
- Must NOT repeat any of these: ${taken}
${hint ? `- The traveller asked for: ${hint}` : ""}

REQUIREMENTS:
- Keep it near the day's other activities so travel time stays low
- Suit the ${period} time slot
- Realistic cost in INR, a local tip, and "outdoor" true/false${ctx ? "" : `, plus the real decimal-degree "lat"/"lng" of the location`}

OUTPUT: Return ONLY a valid JSON object with exactly this shape:
${ctx ? EXAMPLE_GROUNDED : EXAMPLE_UNGROUNDED}`;

  const result = await voyager.integrations.Core.InvokeLLM({ prompt, response_json_schema: ACTIVITY_SCHEMA });
  const activity = result?.activity ? result : result?.[period] || Object.values(result || {}).find((v) => v?.activity);
  if (!activity?.activity) throw new Error("The AI didn't return a usable activity. Please try again.");
  return ctx ? groundActivity(activity, ctx) : activity;
}

const OUTDOOR_WORDS = /\b(beach|trek|hike|hiking|fort|park|garden|boat|cruise|kayak|walk|walking|market|bazaar|safari|lake|waterfall|falls|viewpoint|sunset|sunrise|ghat|ruins|hill|camp|cycling|bike|island|river|lagoon|dunes|outdoor|street|promenade|zoo|valley|pass|monastery|stupa)\b/i;

/** Uses the AI's `outdoor` flag when present, otherwise a keyword heuristic. */
export function isOutdoor(activity) {
  if (!activity) return false;
  if (typeof activity.outdoor === "boolean") return activity.outdoor;
  return OUTDOOR_WORDS.test(`${activity.activity} ${activity.location} ${activity.description}`);
}

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Returns a new itinerary with one activity replaced (or patched when `patch` is a partial object). */
export function withActivity(itinerary, dayIndex, period, activity) {
  const next = clone(itinerary);
  next.days[dayIndex][period] = activity;
  return next;
}

/**
 * Moves an activity on the rearrange board.
 * Within a day the slots are reordered; across days the dragged activity swaps places
 * with the one at the drop position, so every day keeps its three slots.
 */
export function moveActivity(itinerary, from, to) {
  const next = clone(itinerary);
  const fromDay = next.days[from.dayIndex];
  if (from.dayIndex === to.dayIndex) {
    const items = PERIODS.map((p) => fromDay[p]);
    const [moved] = items.splice(from.index, 1);
    items.splice(to.index, 0, moved);
    PERIODS.forEach((p, i) => (fromDay[p] = items[i]));
    return next;
  }
  const toDay = next.days[to.dayIndex];
  const fromPeriod = PERIODS[from.index];
  const toPeriod = PERIODS[Math.min(to.index, PERIODS.length - 1)];
  [fromDay[fromPeriod], toDay[toPeriod]] = [toDay[toPeriod], fromDay[fromPeriod]];
  return next;
}
