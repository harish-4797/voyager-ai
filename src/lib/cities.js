export const CITIES = [
  {
    name: "Mumbai",
    country: "India",
    lat: 19.076,
    lng: 72.8777,
    radiusKm: 45,
    description: "India's financial capital — a vibrant city of Bollywood, street food, and iconic landmarks.",
    img: "https://media.istockphoto.com/id/539018660/photo/taj-mahal-hotel-and-gateway-of-india.jpg?s=612x612&w=0&k=20&c=L1LJVrYMS8kj2rJKlQMcUR88vYoAZeWbYIGkcTo6QV0=",
    tags: ["Culture", "Food", "Nightlife"],
    tagline: "Culture & Street Food",
    avgBudget: 4500,
    bestSeason: "Nov–Feb",
  },
  {
    name: "Delhi",
    country: "India",
    lat: 28.6139,
    lng: 77.209,
    radiusKm: 50,
    description: "India's historic capital blending Mughal architecture, bustling bazaars, and modern neighborhoods.",
    img: "https://media.tacdn.com/media/attractions-splice-spp-674x446/0f/c5/e8/5c.jpg",
    tags: ["History", "Culture", "Food"],
    tagline: "History & Food",
    avgBudget: 3500,
    bestSeason: "Oct–Mar",
  },
  {
    name: "Jaipur",
    country: "India",
    lat: 26.9124,
    lng: 75.7873,
    radiusKm: 45,
    description: "The Pink City — majestic forts, royal palaces, and the vibrant colors of Rajasthan.",
    img: "https://www.worldtribune.org/wp-content/uploads/sites/2/2024/01/GettyImages-1191232894.jpg",
    tags: ["History", "Architecture", "Culture"],
    tagline: "Palaces & Culture",
    avgBudget: 3000,
    bestSeason: "Oct–Mar",
  },
  {
    name: "Goa",
    country: "India",
    lat: 15.35,
    lng: 73.95,
    radiusKm: 90,
    // Search anchors for retrieval (the area is too large for a single 10 km search).
    anchors: [[15.555, 73.755], [15.6, 73.74], [15.497, 73.827], [15.5, 73.912], [15.27, 73.92], [15.01, 74.02], [15.315, 74.314]],
    description: "Sun-soaked beaches, Portuguese heritage, and a laid-back vibe on India's western coast.",
    img: "https://titosgoa.com/api/uploads/1768282500728-why-tourists-visit-goa.png",
    tags: ["Beach", "Nightlife", "Nature"],
    tagline: "Beach & Party",
    avgBudget: 4000,
    bestSeason: "Nov–Feb",
  },
  {
    name: "Varanasi",
    country: "India",
    lat: 25.3176,
    lng: 82.9739,
    radiusKm: 40,
    description: "The spiritual capital of India, famous for its ancient ghats on the holy river Ganges.",
    img: "https://s7ap1.scene7.com/is/image/incredibleindia/ganga-river-crafts-hero?qlt=82&ts=1726674314518",
    tags: ["Spirituality", "Culture", "History"],
    tagline: "Ghats & Spirituality",
    avgBudget: 2500,
    bestSeason: "Oct–Mar",
  },
  {
    name: "Udaipur",
    country: "India",
    lat: 24.5854,
    lng: 73.7125,
    radiusKm: 50,
    description: "The City of Lakes — known for its stunning white palaces and romantic atmosphere.",
    img: "https://www.theleela.com/prod/content/assets/aio-banner/dekstop/Enchanting-palaces-and-forts%20-you-must-visit-in%20-Udaipur.jpg?VersionId=qNo.KWz2yxAUwYYM0AhtCDj1DvNsJ92F",
    tags: ["Palaces", "Lakes", "Romance"],
    tagline: "Lakes & Romance",
    avgBudget: 3500,
    bestSeason: "Oct–Mar",
  },
  {
    name: "Kochi",
    country: "India",
    lat: 9.9312,
    lng: 76.2673,
    radiusKm: 50,
    description: "The Queen of the Arabian Sea — a historic port city in Kerala with colonial charms.",
    img: "https://www.india.com/wp-content/uploads/2024/08/Fort-Kochi.jpg",
    tags: ["History", "Spice", "Coastal"],
    tagline: "Spice & Coast",
    avgBudget: 3000,
    bestSeason: "Oct–Apr",
  },
  {
    name: "Leh",
    country: "India",
    lat: 34.1526,
    lng: 77.5771,
    radiusKm: 250,
    // Search anchors for retrieval (the area is too large for a single 10 km search).
    anchors: [[34.152, 77.577], [33.91, 77.7], [34.2, 77.17], [34.55, 77.56], [33.76, 78.67]],
    description: "High-altitude desert city in Ladakh surrounded by snow-capped Himalayan peaks.",
    img: "https://assets.cntraveller.in/photos/60ba09c482b06272bc86ba08/master/pass/lehguidelead.jpg",
    tags: ["Mountains", "Adventure", "Buddhist"],
    tagline: "Mountains & Adventure",
    avgBudget: 5000,
    bestSeason: "Jun–Sep",
  },
  {
    name: "Hampi",
    country: "India",
    lat: 15.335,
    lng: 76.46,
    radiusKm: 35,
    description: "A UNESCO World Heritage site featuring boulder-strewn landscapes and ancient ruins.",
    img: "https://www.stayvista.com/blog/wp-content/uploads/2024/09/Hampi_karnataka.jpg",
    tags: ["History", "Ruins", "Architecture"],
    tagline: "Ruins & Heritage",
    avgBudget: 2500,
    bestSeason: "Oct–Mar",
  },
];

export const FALLBACK_CITY_IMAGE = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&q=80";

export function getCityImage(name) {
  return CITIES.find((c) => c.name === name)?.img || FALLBACK_CITY_IMAGE;
}

export function findCity(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return CITIES.find((c) => c.name.toLowerCase() === q) || CITIES.find((c) => c.name.toLowerCase().startsWith(q)) || null;
}

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3));

/** Month indexes (0–11) covered by a city's best season, e.g. "Nov–Feb" → [10, 11, 0, 1]. */
export function bestSeasonMonths(city) {
  const [from, to] = (city?.bestSeason || "").split(/[–-]/).map((s) => MONTH_ABBR.indexOf(s.trim()));
  if (from < 0 || to < 0) return [];
  const months = [];
  for (let m = from; ; m = (m + 1) % 12) {
    months.push(m);
    if (m === to) break;
  }
  return months;
}

/** "peak" inside the best season, "shoulder" one month either side, otherwise "off". */
export function seasonFit(city, monthIndex) {
  const months = bestSeasonMonths(city);
  if (months.includes(monthIndex)) return "peak";
  if (months.includes((monthIndex + 1) % 12) || months.includes((monthIndex + 11) % 12)) return "shoulder";
  return "off";
}

export function bestSeasonLabel(city) {
  const months = bestSeasonMonths(city);
  if (!months.length) return city?.bestSeason || "";
  return `${MONTHS[months[0]]} – ${MONTHS[months[months.length - 1]]}`;
}

/**
 * Picks a destination for "Surprise me": favours cities in season for the month whose
 * typical daily spend fits the budget, with a little randomness for variety.
 */
export function surpriseDestination({ monthIndex, budget, days, exclude = [] }) {
  const perDay = budget / Math.max(1, days);
  const scored = CITIES.filter((c) => !exclude.includes(c.name)).map((city) => {
    const fit = seasonFit(city, monthIndex);
    // Season dominates (an off-season city can never beat an in-season one); budget and a
    // little randomness only decide between cities in the same season band.
    const seasonScore = fit === "peak" ? 6 : fit === "shoulder" ? 3 : 0;
    const ratio = perDay / city.avgBudget;
    const budgetScore = ratio >= 1 ? 2 : ratio >= 0.75 ? 1 : 0;
    return { city, fit, fitsBudget: ratio >= 0.75, score: seasonScore + budgetScore + Math.random() * 0.9 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}
