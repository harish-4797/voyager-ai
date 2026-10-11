# VoyagerAI — AI Travel Itinerary Generator ✈️

An AI-powered travel planner built with React + Vite. Tell it where, when and what you love, and it creates a personalised, budget-aware, day-by-day itinerary, which you can then refine without starting over.

## Features

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
   VITE_GROQ_API_KEY=your-groq-api-key-here
   # Optional, defaults to openai/gpt-oss-120b
   VITE_GROQ_MODEL=openai/gpt-oss-120b
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```
   Then open `http://localhost:5173`.

> ⚠️ **Don't deploy this publicly as-is.** Vite embeds every `VITE_` variable into the browser bundle, so anyone visiting a deployed site could read your Groq key. For a public deployment, move the Groq call into a server-side function (e.g. a Vercel/Netlify/Cloudflare function) that keeps the key secret.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **UI:** Radix UI / shadcn/ui, Framer Motion, Lucide icons
- **AI:** Groq (OpenAI-compatible chat completions)
- **Maps:** Leaflet + OpenStreetMap tiles, Nominatim geocoding
- **Weather:** Open-Meteo (forecast + historical archive, no key required)
- **Storage:** Browser localStorage

## Project Structure

```
src/
├── api/            # voyagerClient — localStorage storage + Groq API
├── components/
│   ├── common/     # Brand, page header
│   ├── home/       # Landing page sections & scroll animations
│   ├── motion/     # Reusable animation primitives
│   ├── planner/    # Trip planner steps, Surprise me, season insight
│   ├── trip/       # Day cards, maps, weather, rearrange board, packing
│   └── ui/         # shadcn/ui primitives
├── lib/            # Itinerary AI logic, weather, geocoding, city data
├── pages/          # Route pages
└── utils/          # Helpers
```

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Weather data by [Open-Meteo](https://open-meteo.com/).

## License

MIT
