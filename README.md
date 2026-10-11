# VoyagerAI — AI Travel Itinerary Generator ✈️

An AI-powered travel planner built with React + Vite. Tell it where, when and what you love, and it creates a personalised, budget-aware, day-by-day itinerary, which you can then refine without starting over.

## Features

- 🔎 **RAG-grounded itineraries** — the AI plans only from real places retrieved from Wikipedia and OpenStreetMap, and every stop is verified with source links
- 🤖 **AI itineraries** — morning, afternoon and evening plans with costs, durations and local tips (via Groq)
- 🗺️ **Day maps** — every day's stops pinned on a map with a route line and one-tap Google Maps directions
- 🔀 **Edit, don't regenerate** — swap a single activity ("cheaper", "indoor", or your own request) with undo, drag activities between days, and add personal notes
- 🌦️ **Weather-aware** — live forecast for trips in the next 16 days, typical weather otherwise, plus warnings when an outdoor plan lands on a rainy day
- 🎲 **Surprise me** — picks a destination that's in season for your month and fits your budget
- 📅 **Best-season guidance** — see whether your travel month is a good time to visit, with typical temperatures and rainy days
- 💰 **Budget breakdown** — category-wise cost estimates against your total
- 🎒 **Smart packing list**, 📲 **WhatsApp sharing** and 📄 **PDF export**
- 💾 **No backend needed** — trips and preferences are saved in your browser's localStorage

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A **Groq API key** — free at [console.groq.com/keys](https://console.groq.com/keys)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a `.env` file** in the project root (copy `.env.example`):
   ```env
   GROQ_API_KEY=your-groq-api-key-here
   # Optional, defaults to openai/gpt-oss-120b
   VITE_GROQ_MODEL=openai/gpt-oss-120b
   ```
   `GROQ_API_KEY` is deliberately **not** prefixed with `VITE_`, so it's never bundled into the browser code.

3. **Start the dev server**
   ```bash
   npm run dev
   ```
   Then open `http://localhost:5173`.

## RAG pipeline

Itineraries are generated with retrieval-augmented generation rather than from the model's memory alone:

```
 Retrieve ──► Rank ──► Enrich ──► Weather ──► Generate ──► Ground
 Wikipedia    BM25 +    Wikipedia   Open-Meteo   Groq LLM     match each stop to a
 geosearch +  notability summaries  forecast /   (cites       retrieved place → real
 Nominatim    + interest            typical      place ids)   coords + source links
 (OSM)        quotas
```

1. **Retrieve** ([`src/lib/rag/places.js`](src/lib/rag/places.js)) — real places around the city: notable attractions via Wikipedia geosearch (with their descriptions) and everyday places (restaurants, cafés, bars, beaches, markets…) via OpenStreetMap Nominatim. Cached for 7 days.
2. **Rank** ([`src/lib/rag/ranking.js`](src/lib/rag/ranking.js)) — Okapi BM25 against the traveller's interests (with query expansion), plus notability, time-of-day fit, proximity (for swaps) and an avoid-list penalty; a diversity step gives each interest a fair share of the top 40.
3. **Enrich** — short Wikipedia summaries for the top attractions; **weather** for the trip dates.
4. **Generate** — the prompt lists the places as `[P1] … [P40]`; the model must build every activity from one of them and cite its id.
5. **Ground** ([`src/lib/rag/grounding.js`](src/lib/rag/grounding.js)) — each activity is matched back to a retrieved place (by citation, then by name); verified stops get real coordinates and Wikipedia/OSM links, unmatched ones are labelled "unverified". Stats are stored as `itinerary.rag` and shown in the trip's Sources panel.

Single-activity swaps use the same pipeline, re-ranked for the request ("cheaper", "food"…) and the day's location. If retrieval sources are unavailable, generation falls back to the plain LLM prompt and the trip is labelled accordingly.

## How the API key stays secret

The browser never talks to Groq directly. It calls `/api/groq` on the same site, and a small server-side proxy ([`api/_groq-core.js`](api/_groq-core.js)) adds the key and forwards the request. The proxy only accepts same-site requests, allow-listed models, capped prompt/response sizes, and ~20 requests per minute per visitor. Locally, `npm run dev` serves the same proxy through Vite.

## Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repository. Vercel detects Vite automatically (settings are also in `vercel.json`).
3. Under **Environment Variables**, add `GROQ_API_KEY` with your key (optionally `VITE_GROQ_MODEL`).
4. Click **Deploy**. Every later `git push` to `main` redeploys automatically.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **UI:** Radix UI / shadcn/ui, Framer Motion, Lucide icons
- **AI:** Groq (OpenAI-compatible chat completions) with a retrieval-augmented (RAG) pipeline
- **Knowledge sources:** Wikipedia (geosearch + page summaries), OpenStreetMap Nominatim
- **Maps:** Leaflet + OpenStreetMap tiles, Nominatim geocoding
- **Weather:** Open-Meteo (forecast + historical archive, no key required)
- **Storage:** Browser localStorage

## Project Structure

```
api/
├── groq.js         # Vercel serverless function: POST /api/groq
└── _groq-core.js   # Shared proxy logic (also used by the Vite dev server)
src/
├── api/            # voyagerClient — localStorage storage + calls to /api/groq
├── components/
│   ├── common/     # Brand, page header
│   ├── home/       # Landing page sections & scroll animations
│   ├── motion/     # Reusable animation primitives
│   ├── planner/    # Trip planner steps, Surprise me, season insight
│   ├── trip/       # Day cards, maps, weather, rearrange board, packing
│   └── ui/         # shadcn/ui primitives
├── lib/            # Itinerary AI logic, weather, geocoding, city data
│   └── rag/        # RAG pipeline: retrieval, BM25 ranking, grounding
├── pages/          # Route pages
└── utils/          # Helpers
```

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Weather data by [Open-Meteo](https://open-meteo.com/).

## License

MIT
