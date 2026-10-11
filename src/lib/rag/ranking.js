/**
 * RAG step 2 — Ranking.
 * Scores retrieved place documents against the traveller's request with BM25 lexical
 * relevance plus notability, interest, time-of-day and proximity signals, then picks a
 * diverse top-K for the prompt. Pure functions (no I/O) so they're easy to test.
 */

const STOPWORDS = new Set(
  "the and for with from into near this that your have has are was its our you of in on at to by is it as be or an a not but also all any can will".split(" ")
);

export function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Query expansion: each interest maps to words that appear in relevant place documents. */
const INTEREST_TERMS = {
  food: ["restaurant", "cafe", "cuisine", "seafood", "regional", "local", "street", "thali", "vegetarian", "indian"],
  culture: ["museum", "fort", "palace", "temple", "church", "basilica", "cathedral", "mosque", "heritage", "historic", "monument", "ruins", "shrine"],
  adventure: ["trek", "diving", "surfing", "kayaking", "waterfall", "peak", "adventure", "island", "cave", "sanctuary"],
  shopping: ["market", "bazaar", "shop", "craft", "souvenir", "mall"],
  photography: ["viewpoint", "sunset", "sunrise", "lake", "waterfall", "fort", "view", "island", "beach"],
  nightlife: ["bar", "pub", "nightclub", "club", "music", "night"],
  beach: ["beach", "sea", "coast", "shore", "island", "bay"],
  nature: ["park", "garden", "lake", "waterfall", "nature", "reserve", "sanctuary", "peak", "wildlife", "bird", "island"],
  wellness: ["spa", "yoga", "ayurveda", "massage", "wellness"],
  art: ["gallery", "art", "arts", "theatre", "museum"],
};

const PERIOD_TERMS = {
  morning: ["fort", "temple", "church", "beach", "viewpoint", "museum", "sanctuary", "waterfall", "heritage"],
  afternoon: ["museum", "market", "gallery", "palace", "fort", "cafe", "heritage"],
  evening: ["restaurant", "bar", "pub", "nightclub", "beach", "viewpoint", "market", "sunset", "cafe"],
};

const PERIOD_KINDS = {
  morning: new Set(["fort", "worship", "beach", "viewpoint", "museum", "park", "waterfall", "heritage", "monument", "landmark"]),
  afternoon: new Set(["museum", "market", "gallery", "palace", "fort", "cafe", "heritage", "monument", "spa"]),
  evening: new Set(["restaurant", "nightlife", "beach", "viewpoint", "market", "cafe"]),
};

/** Hint keywords → the interest vocabulary/category they imply (e.g. "food" → restaurant, café…). */
const HINT_INTERESTS = [
  [/food|eat|dinner|lunch|breakfast|restaurant|cafe|cuisine|seafood|thali/i, "food", "food"],
  [/bar|pub|club|nightlife|drinks/i, "nightlife", "nightlife"],
  [/spa|massage|relax|wellness|yoga|ayurved/i, "wellness", "wellness"],
  [/shop|market|bazaar|souvenir/i, "shopping", "shopping"],
  [/art|gallery|theatre|theater/i, "art", "art"],
  [/beach|sea|swim/i, "beach", "beach"],
  [/trek|hike|waterfall|nature|park|lake|wildlife/i, "nature", "nature"],
  [/temple|church|spiritual|heritage|history|museum|culture/i, "culture", "sights"],
];

/** Categories a free-text hint is asking for. */
export function hintCategories(hint = "") {
  return HINT_INTERESTS.filter(([re]) => re.test(hint)).map(([, , category]) => category);
}

/** Weighted query terms built from interests, travel style, a free-text hint and the time slot. */
export function buildQueryTerms({ interests = [], prefs = null, hint = "", period = null } = {}) {
  const weights = new Map();
  const add = (word, w) => tokenize(word).forEach((t) => weights.set(t, (weights.get(t) || 0) + w));
  interests.forEach((i) => {
    add(i, 1.5);
    (INTEREST_TERMS[i] || []).forEach((t) => add(t, 1));
  });
  (prefs?.travel_style || []).forEach((s) => add(s, 0.6));
  if (hint) {
    add(hint, 2.5);
    HINT_INTERESTS.forEach(([re, interest]) => re.test(hint) && (INTEREST_TERMS[interest] || []).forEach((t) => add(t, 2)));
  }
  if (period) (PERIOD_TERMS[period] || []).forEach((t) => add(t, 0.5));
  return weights;
}

const docText = (d) => `${d.name} ${d.label} ${d.kind} ${d.category} ${d.description} ${d.cuisine} ${d.wiki_extract || ""}`;

/** Okapi BM25 over the place documents. Returns one score per document. */
export function bm25(docs, queryWeights, { k1 = 1.2, b = 0.75 } = {}) {
  const tokens = docs.map((d) => tokenize(docText(d)));
  const N = docs.length || 1;
  const avgdl = tokens.reduce((n, t) => n + t.length, 0) / N || 1;
  const df = new Map();
  tokens.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
  return tokens.map((t) => {
    const tf = new Map();
    t.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    let score = 0;
    for (const [term, weight] of queryWeights) {
      const f = tf.get(term);
      if (!f) continue;
      const n = df.get(term) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += weight * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avgdl)));
    }
    return score;
  });
}

function km(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const norm = (s) => tokenize(s).join(" ");

/**
 * Scores and sorts documents. Returns copies with a `score` (and `why` breakdown for debugging).
 * @param {object} opts
 * @param {Set<string>|string[]} [opts.categories] categories the traveller asked for
 * @param {{lat:number,lng:number}} [opts.near] boost places near this point (swaps)
 * @param {string[]} [opts.exclude] place ids or names already used in the trip
 */
export function rankPlaces(docs, { interests = [], prefs = null, hint = "", period = null, categories = [], near = null, exclude = [] } = {}) {
  const wanted = new Set(categories);
  const excluded = new Set(exclude.map((e) => (e.includes("/") ? e : norm(e))));
  const pool = docs.filter((d) => !excluded.has(d.id) && !excluded.has(norm(d.name)));
  const query = buildQueryTerms({ interests, prefs, hint, period });
  const lexical = bm25(pool, query);
  const maxLex = Math.max(...lexical, 1e-9);
  const avoidTerms = new Set(tokenize((prefs?.avoided_activities || []).join(" ")));
  const asked = new Set(hintCategories(hint));

  return pool
    .map((d, i) => {
      const relevance = (lexical[i] / maxLex) * 3;
      const notability =
        (d.source === "wikipedia" ? 1.5 : 0) + (d.wikidata ? 0.8 : 0) + Math.min(d.importance || 0, 1) * 1.5 + (d.description ? 0.2 : 0);
      const interest = wanted.has(d.category) ? (d.category === "sights" || d.category === "food" ? 0.6 : 1.2) : 0;
      const timeFit = period && PERIOD_KINDS[period]?.has(d.kind) ? 1 : 0;
      const hintFit = asked.has(d.category) ? 3 : 0; // the traveller explicitly asked for this type
      const proximity = near ? 2.5 * Math.exp(-km(near, d) / 6) : 0;
      const avoid = tokenize(docText(d)).some((t) => avoidTerms.has(t)) ? -2 : 0;
      const score = relevance + notability + interest + timeFit + hintFit + proximity + avoid;
      return { ...d, score, why: { relevance, notability, interest, timeFit, hintFit, proximity, avoid } };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Picks a diverse top-K. With `categories` (full itineraries) every requested category first
 * gets a fair quota so one notable-but-narrow type (e.g. temples with Wikipedia pages) can't
 * crowd out the traveller's other interests; remaining slots go by score. Without categories
 * (swaps) it's pure ranking, so the hint and proximity decide.
 */
export function selectContext(ranked, { k = 40, categories = null, minFood = 6 } = {}) {
  const chosen = [];
  const counts = {};
  const take = (d) => {
    chosen.push(d);
    counts[d.category] = (counts[d.category] || 0) + 1;
  };
  const cats = categories ? [...new Set(categories)] : [];
  const quota = cats.length ? Math.max(3, Math.floor(k / cats.length)) : k;
  const cap = cats.length ? quota + 4 : k;

  if (cats.length) {
    for (const cat of cats) {
      const want = cat === "food" ? Math.max(minFood, quota) : quota;
      ranked.filter((d) => d.category === cat).slice(0, want).forEach((d) => chosen.length < k && take(d));
    }
  }
  for (const d of ranked) {
    if (chosen.length >= k) break;
    if (chosen.includes(d) || (counts[d.category] || 0) >= cap) continue;
    take(d);
  }
  return chosen.sort((a, b) => b.score - a.score);
}
