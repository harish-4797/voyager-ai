/**
 * RAG step 1 — Retrieval.
 * Builds a knowledge base of real places for a city from two free sources:
 *  - Wikipedia geosearch: notable attractions with their Wikidata descriptions
 *  - OpenStreetMap Nominatim: everyday places (restaurants, cafés, bars, beaches, markets…)
 * Results are normalised into "place documents" and cached in localStorage for 7 days.
 */
import { nominatimSearch } from "@/lib/geocode";

const CACHE_PREFIX = "rag:places:v5:";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const WIKI_API = "https://en.wikipedia.org/w/api.php";

/** Nominatim phrase searches per category ("full" = whole city area, "near" = central 30 km). */
const NOMINATIM_QUERIES = {
  sights: [{ q: "museum", radius: "near", limit: 20 }],
  food: [
    { q: "restaurant", radius: "near", limit: 40 },
    { q: "cafe", radius: "near", limit: 25 },
  ],
  nightlife: [
    { q: "bar", radius: "near", limit: 30 },
    { q: "nightclub", radius: "near", limit: 15 },
  ],
  beach: [{ q: "beach", radius: "full", limit: 40 }],
  shopping: [{ q: "market", radius: "near", limit: 25 }],
  wellness: [{ q: "spa", radius: "near", limit: 20 }],
  nature: [{ q: "viewpoint", radius: "full", limit: 20 }],
  art: [{ q: "art gallery", radius: "near", limit: 20 }],
};

/** Which categories to retrieve for each interest (ids from the planner's InterestPicker). */
const INTEREST_CATEGORIES = {
  food: ["food"],
  culture: ["worship"],
  adventure: ["adventure", "nature"],
  shopping: ["shopping"],
  photography: ["nature"],
  nightlife: ["nightlife"],
  beach: ["beach", "adventure"],
  nature: ["nature"],
  wellness: ["wellness"],
  art: ["art"],
};

/** Extra categories implied by free-text swap hints such as "a spa" or "street food". */
const HINT_CATEGORIES = [
  [/food|eat|dinner|lunch|breakfast|restaurant|cafe|street food|seafood/i, "food"],
  [/bar|pub|club|nightlife|drinks/i, "nightlife"],
  [/spa|massage|relax|wellness|yoga|ayurved/i, "wellness"],
  [/shop|market|bazaar|souvenir/i, "shopping"],
  [/art|gallery|theatre|theater/i, "art"],
  [/beach|sea|swim/i, "beach"],
  [/trek|hike|waterfall|nature|park|lake|wildlife/i, "nature"],
  [/temple|church|mosque|spiritual|worship/i, "worship"],
];

/** Categories to retrieve: core sights + food always, plus whatever the interests/hint need. */
export function categoriesFor(interests = [], hint = "") {
  const set = new Set(["sights", "food"]);
  interests.forEach((i) => (INTEREST_CATEGORIES[i] || []).forEach((c) => set.add(c)));
  HINT_CATEGORIES.forEach(([re, cat]) => re.test(hint || "") && set.add(cat));
  return [...set].sort();
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");

/** Classifies OpenStreetMap tags: [test, kind, label, category, outdoor]. First match wins. */
const TAG_RULES = [
  [(t) => t.natural === "beach", "beach", () => "Beach", "beach", true],
  [(t) => /^(fort|castle|citywalls)$/.test(t.historic), "fort", () => "Fort", "sights", true],
  [(t) => t.tourism === "museum", "museum", () => "Museum", "sights", false],
  [(t) => t.tourism === "gallery", "gallery", () => "Art gallery", "art", false],
  [(t) => t.tourism === "viewpoint", "viewpoint", () => "Viewpoint", "nature", true],
  [(t) => t.amenity === "restaurant", "restaurant", (t) => `Restaurant${t.cuisine ? ` (${t.cuisine.replace(/;/g, ", ").replace(/_/g, " ")})` : ""}`, "food", false],
  [(t) => t.amenity === "cafe", "cafe", () => "Café", "food", false],
  [(t) => /^(bar|pub|nightclub)$/.test(t.amenity), "nightlife", (t) => cap(t.amenity), "nightlife", false],
  [(t) => t.amenity === "marketplace" || t.shop === "mall", "market", () => "Market", "shopping", true],
  [(t) => /^(spa|sauna)$/.test(t.leisure) || t.shop === "massage" || t.amenity === "spa", "spa", () => "Spa / wellness", "wellness", false],
];

/** Classifies a Wikipedia article from its short description / title. */
const WIKI_RULES = [
  [/\bbeach\b/i, "beach", "Beach", "beach", true],
  [/\b(fort|fortress|castle)\b/i, "fort", "Fort", "sights", true],
  [/\b(palace|haveli)\b/i, "palace", "Palace", "sights", false],
  [/\b(basilica|cathedral|church|chapel|convent)\b/i, "worship", "Church", "worship", false],
  [/\b(temple|mandir|shrine|gurudwara|gurdwara|mosque|masjid|dargah|monastery|gompa|stupa|house of worship)\b/i, "worship", "Temple / shrine", "worship", false],
  [/\bmuseum\b/i, "museum", "Museum", "sights", false],
  [/\b(art gallery|gallery|arts centre)\b/i, "gallery", "Art gallery", "art", false],
  [/\b(waterfall|falls)\b/i, "waterfall", "Waterfall", "nature", true],
  [/\b(lake|lagoon|backwater)\b/i, "landmark", "Lake", "nature", true],
  [/\b(sanctuary|national park|wildlife|reserve|mangrove)\b/i, "park", "Nature reserve", "nature", true],
  [/\b(garden|park)\b/i, "park", "Park / garden", "nature", true],
  [/\bisland\b/i, "landmark", "Island", "nature", true],
  [/\b(hill|peak|mountain|pass|valley|cave|caves)\b/i, "landmark", "Natural landmark", "nature", true],
  [/\b(ruins|archaeological|world heritage|heritage site|ancient)\b/i, "heritage", "Heritage site", "sights", true],
  [/\b(monument|memorial|gate|tomb|mausoleum|minar|stepwell|ghat|tower|lighthouse|observatory|bridge)\b/i, "monument", "Monument / landmark", "sights", true],
  [/\b(market|bazaar)\b/i, "market", "Market", "shopping", true],
  [/\b(zoo|aquarium|amusement park|theme park|water park)\b/i, "attraction_park", "Attraction park", "sights", true],
];

/** Articles that mention a tourist keyword but aren't places to visit. */
const WIKI_EXCLUDE =
  /\b(school|college|university|institute|hospital|station|railway|metro|airport|company|constituency|village|town|city|neighbourhood|neighborhood|suburb|locality|district|taluka|tehsil|ward|panchayat|road|street|boulevard|highway|hotel|stadium|bank|club|film|politician|cricketer|actor|newspaper)\b/i;

/** Classifies a Wikipedia article by its Wikidata short description (title only as a fallback). */
function classifyWiki(description, title) {
  const text = description || title;
  if (WIKI_EXCLUDE.test(text)) return null;
  for (const [re, kind, label, category, outdoor] of WIKI_RULES) if (re.test(text)) return { kind, label, category, outdoor };
  return null;
}

function classifyTags(tags) {
  for (const [test, kind, label, category, outdoor] of TAG_RULES) {
    if (test(tags)) return { kind, label: label(tags), category, outdoor };
  }
  return null;
}

const normName = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Search anchors: explicit hotspots for large areas, otherwise centre + a ring of points. */
function anchorsFor(area) {
  if (area.anchors?.length) return area.anchors;
  const pts = [[area.lat, area.lng]];
  const ring = (r, n, offset = 0) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + offset) / n) * Math.PI * 2;
      pts.push([area.lat + (r / 111) * Math.cos(a), area.lng + (r / (111 * Math.cos((area.lat * Math.PI) / 180))) * Math.sin(a)]);
    }
  };
  // Dense cities pack hundreds of articles near the centre, so search an inner and an outer ring.
  if (area.radiusKm > 12) ring(7, 6);
  if (area.radiusKm > 30) ring(18, 6, 0.5);
  return pts;
}

async function wikipediaNear([lat, lng]) {
  const url =
    `${WIKI_API}?action=query&format=json&origin=*&generator=geosearch&ggscoord=${lat}%7C${lng}` +
    `&ggsradius=10000&ggslimit=300&prop=coordinates%7Cdescription%7Cpageprops&ppprop=wikibase_item&colimit=max`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const pages = Object.values((await res.json()).query?.pages || {});
  return pages
    .map((p) => {
      const coord = p.coordinates?.[0];
      const kind = classifyWiki(p.description, p.title);
      if (!coord || !kind) return null;
      return {
        source: "wikipedia",
        id: `wiki/${p.pageid}`,
        name: p.title.replace(/\s*\(.*?\)\s*$/, ""),
        ...kind,
        lat: coord.lat,
        lng: coord.lon,
        description: p.description || "",
        cuisine: "",
        wikipedia_title: p.title,
        wikidata: p.pageprops?.wikibase_item || "",
        importance: 0.6,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      };
    })
    .filter(Boolean);
}

function viewbox(area, radiusKm) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((area.lat * Math.PI) / 180));
  const f = (n) => n.toFixed(4);
  return `${f(area.lng - dLng)},${f(area.lat + dLat)},${f(area.lng + dLng)},${f(area.lat - dLat)}`;
}

async function nominatimCategory(area, { q, radius, limit }) {
  const r = radius === "full" ? Math.min(area.radiusKm, 120) : Math.min(area.radiusKm, 30);
  const params = (km) => `q=${encodeURIComponent(q)}&viewbox=${viewbox(area, km)}&bounded=1&extratags=1&namedetails=1`;
  let results;
  try {
    results = await nominatimSearch(params(r), limit);
  } catch {
    // A rate-limit/error response can get cached for an exact URL (and arrives without CORS
    // headers). Back off, then retry once with the box nudged ~100 m so it's a fresh request.
    await new Promise((res) => setTimeout(res, 1500));
    results = await nominatimSearch(params(r + 0.1), limit);
  }
  return results
    .map((x) => {
      const tags = { ...(x.extratags || {}), [x.category]: x.type };
      const kind = classifyTags(tags);
      const name = x.namedetails?.["name:en"] || x.name;
      if (!kind || !name) return null;
      const wiki = /^en:(.+)$/.exec(tags.wikipedia || "");
      return {
        source: "osm",
        id: `${x.osm_type}/${x.osm_id}`,
        name,
        ...kind,
        lat: Number(x.lat),
        lng: Number(x.lon),
        description: tags.description || "",
        cuisine: tags.cuisine || "",
        wikipedia_title: wiki ? wiki[1] : "",
        wikidata: tags.wikidata || "",
        importance: Number(x.importance) || 0,
        url: `https://www.openstreetmap.org/${x.osm_type}/${x.osm_id}`,
      };
    })
    .filter(Boolean);
}

/** Merges duplicates (same name within ~600 m), preferring the Wikipedia record. */
function dedupe(docs) {
  const kept = [];
  for (const d of docs) {
    const i = kept.findIndex(
      (k) => normName(k.name) === normName(d.name) && Math.abs(k.lat - d.lat) < 0.006 && Math.abs(k.lng - d.lng) < 0.006
    );
    if (i === -1) kept.push(d);
    else {
      const [keep, other] = kept[i].source === "wikipedia" ? [kept[i], d] : [d, kept[i]];
      kept[i] = { ...keep, cuisine: keep.cuisine || other.cuisine, osm_url: other.source === "osm" ? other.url : keep.osm_url };
    }
  }
  return kept;
}

function readCache(key) {
  try {
    const hit = JSON.parse(localStorage.getItem(key));
    if (hit && hit.expires > Date.now()) return hit.docs;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(key, docs) {
  try {
    localStorage.setItem(key, JSON.stringify({ docs, expires: Date.now() + CACHE_TTL }));
  } catch {
    /* storage full — retrieval still works, just uncached */
  }
}

/**
 * Retrieves place documents for a city area and set of categories.
 * @param {{name: string, lat: number, lng: number, radiusKm: number, anchors?: number[][]}} area
 * @returns {Promise<{docs: object[], sources: {wikipedia: number, osm: number}}>}
 */
export async function fetchPlaces(area, categories) {
  const key = `${CACHE_PREFIX}${area.name}:${categories.join(",")}`;
  const cached = readCache(key);
  if (cached) return cached;

  const wikiTask = Promise.allSettled(anchorsFor(area).map(wikipediaNear)).then((rs) =>
    rs.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
  );
  const osmQueries = categories.flatMap((c) => NOMINATIM_QUERIES[c] || []);
  const osmTask = (async () => {
    const out = [];
    for (const q of osmQueries) {
      try {
        out.push(...(await nominatimCategory(area, q)));
      } catch (err) {
        // One failed category shouldn't sink retrieval, but say so for debugging.
        console.warn(`Place retrieval: OpenStreetMap "${q.q}" search failed:`, err.message);
      }
    }
    return out;
  })();

  const [wiki, osm] = await Promise.all([wikiTask, osmTask]);
  const docs = dedupe([...wiki, ...osm]);
  const result = { docs, sources: { wikipedia: wiki.length, osm: osm.length } };
  if (docs.length) writeCache(key, result);
  return result;
}

const WIKI_PREFIX = "rag:wiki:v1:";

/** Adds short Wikipedia extracts to documents that link to an English Wikipedia article. */
export async function enrichWithWikipedia(docs, max = 12) {
  const targets = docs.filter((d) => d.wikipedia_title).slice(0, max);
  await Promise.all(
    targets.map(async (doc) => {
      const key = WIKI_PREFIX + doc.wikipedia_title;
      let extract = null;
      try {
        extract = localStorage.getItem(key);
      } catch {
        /* ignore */
      }
      if (extract === null) {
        try {
          const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(doc.wikipedia_title.replace(/ /g, "_"))}`,
            { signal: AbortSignal.timeout(8000) }
          );
          extract = res.ok ? (await res.json()).extract || "" : "";
        } catch {
          extract = "";
        }
        try {
          localStorage.setItem(key, extract);
        } catch {
          /* ignore */
        }
      }
      extract = (extract || "").replace(/\s+/g, " ").trim();
      if (extract) {
        doc.wiki_extract = extract.length > 260 ? `${extract.slice(0, 257).replace(/\s+\S*$/, "")}…` : extract;
        doc.wikipedia_url = `https://en.wikipedia.org/wiki/${encodeURIComponent(doc.wikipedia_title.replace(/ /g, "_"))}`;
      }
    })
  );
  return docs;
}
