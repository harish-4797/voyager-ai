import { proxyGroq } from "./_groq-core.js";

// Itinerary generation can take a while on long trips.
export const config = { maxDuration: 60 };

/** Vercel serverless function: POST /api/groq */
export default async function handler(req, res) {
  try {
    const result = await proxyGroq({
      method: req.method,
      body: req.body,
      apiKey: process.env.GROQ_API_KEY,
      ip: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress,
      origin: req.headers.origin,
      host: req.headers["x-forwarded-host"] || req.headers.host,
      extraModels: [process.env.GROQ_MODEL, process.env.VITE_GROQ_MODEL],
    });
    res.status(result.status).json(result.json);
  } catch (err) {
    console.error("Groq proxy error:", err);
    res.status(502).json({ error: { message: "Could not reach the AI service. Please try again." } });
  }
}
