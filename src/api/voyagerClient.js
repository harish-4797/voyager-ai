/**
 * VoyagerClient — Standalone local-first travel planning service
 * 
 * Provides:
 * - localStorage-based Trip CRUD operations
 * - Local user management (no external auth)
 * - Google Gemini API integration for LLM calls
 */

// ========================
// Trip Storage (localStorage)
// ========================

const TRIPS_STORAGE_KEY = 'voyager_trips';
const USER_PREFS_KEY = 'voyager_user_prefs';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function getTrips() {
    try {
        const data = localStorage.getItem(TRIPS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveTrips(trips) {
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}

const TripService = {
    /**
     * List trips, sorted by a field. Supports "-field" for descending order.
     */
    async list(sortBy = '-created_date', limit = 50) {
        let trips = getTrips();

        const desc = sortBy.startsWith('-');
        const field = desc ? sortBy.slice(1) : sortBy;

        trips.sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';
            if (desc) return aVal > bVal ? -1 : 1;
            return aVal > bVal ? 1 : -1;
        });

        return trips.slice(0, limit);
    },

    /**
     * Filter trips by criteria (e.g., { id: "abc123" }).
     */
    async filter(criteria) {
        const trips = getTrips();
        return trips.filter(trip => {
            return Object.entries(criteria).every(([key, value]) => trip[key] === value);
        });
    },

    /**
     * Create a new trip.
     */
    async create(data) {
        const trips = getTrips();
        const newTrip = {
            ...data,
            id: generateId(),
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
        };
        trips.push(newTrip);
        saveTrips(trips);
        return newTrip;
    },

    /**
     * Update an existing trip by ID.
     */
    async update(id, data) {
        const trips = getTrips();
        const index = trips.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Trip not found');

        trips[index] = {
            ...trips[index],
            ...data,
            updated_date: new Date().toISOString(),
        };
        saveTrips(trips);
        return trips[index];
    },

    /**
     * Delete a trip by ID.
     */
    async delete(id) {
        const trips = getTrips();
        const filtered = trips.filter(t => t.id !== id);
        saveTrips(filtered);
        return true;
    },
};

// ========================
// User / Auth (Local)
// ========================

const DEFAULT_USER = {
    full_name: 'Traveler',
    email: 'traveler@voyagerai.local',
    role: 'user',
    travel_style: [],
    dietary_restrictions: [],
    preferred_budget_range: 'mid-range',
    home_airport: '',
    avoided_activities: [],
    past_trips_summary: [],
};

function getUserPrefs() {
    try {
        const data = localStorage.getItem(USER_PREFS_KEY);
        return data ? { ...DEFAULT_USER, ...JSON.parse(data) } : { ...DEFAULT_USER };
    } catch {
        return { ...DEFAULT_USER };
    }
}

function saveUserPrefs(prefs) {
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
}

const AuthService = {
    async me() {
        return getUserPrefs();
    },

    async updateMe(data) {
        const current = getUserPrefs();
        const updated = { ...current, ...data };
        saveUserPrefs(updated);
        return updated;
    },

    logout() {
        // No-op in standalone mode, but we can clear the session if needed
        console.log('Logout called (standalone mode - no external auth)');
    },

    redirectToLogin() {
        // No-op in standalone mode
        console.log('Login redirect called (standalone mode - no external auth)');
    },
};

// ========================
// OpenAI (ChatGPT) Integration
// ========================


// Groq API Integration — calls go through our own /api/groq proxy so the API key
// stays on the server (see api/_groq-core.js). Never put the key in a VITE_ variable.
const AI_ENDPOINT = '/api/groq';
const PREFERRED_MODEL = import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-120b';

// Fallback models in case a model is deprecated, retired, or unavailable
const CANDIDATE_MODELS = Array.from(new Set([
    PREFERRED_MODEL,
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
]));

function parseOrRepairJson(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // 1. Direct parse attempt
    try {
        return JSON.parse(cleaned);
    } catch {}

    // 2. Fix missing opening brace on repeated object keys like ,"day":2
    const withBraces = cleaned.replace(/(\}\s*,\s*)"day"\s*:\s*(\d+)/g, '$1{"day":$2');
    try {
        return JSON.parse(withBraces);
    } catch {}

    // 3. Extract JSON object substring
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch {}
        try {
            return JSON.parse(match[0].replace(/(\}\s*,\s*)"day"\s*:\s*(\d+)/g, '$1{"day":$2'));
        } catch {}
    }

    return null;
}

const AIService = {
    /**
     * Invoke Groq (via the server-side proxy) for AI-powered itinerary generation.
     */
    async InvokeLLM({ prompt, response_json_schema }) {
        const systemInstruction = 'You are an expert travel assistant. Always respond with valid JSON only, no markdown formatting, no code fences, no extra text.';

        let lastError = null;

        for (const model of CANDIDATE_MODELS) {
            // First attempt: with response_format (if requested)
            // Second attempt: without response_format if Groq 400 "Failed to generate JSON" occurs
            const formatOptions = response_json_schema ? [{ type: 'json_object' }, undefined] : [undefined];

            for (const format of formatOptions) {
                try {
                    const response = await fetch(AI_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            messages: [
                                { role: 'system', content: systemInstruction },
                                { role: 'user', content: prompt },
                            ],
                            max_tokens: 8192,
                            ...(format ? { response_format: format } : {}),
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const errorMsg = errorData?.error?.message || response.statusText;

                        // Check if Groq returned failed_generation in error payload (HTTP 400)
                        if (errorData?.error?.failed_generation) {
                            const recovered = parseOrRepairJson(errorData.error.failed_generation);
                            if (recovered) {
                                console.info(`Successfully recovered valid itinerary from failed_generation on model ${model}!`);
                                return recovered;
                            }
                        }

                        lastError = new Error(`Groq API error (${response.status}): ${errorMsg}`);

                        // If model doesn't exist / 404, break format loop and try next model
                        if (response.status === 404) {
                            console.warn(`Groq model "${model}" not found (404). Trying next fallback model...`);
                            break;
                        }

                        // If 400 (Failed to generate JSON), retry without json_object mode (second format option)
                        if (response.status === 400 && format) {
                            console.warn(`Groq JSON format mode rejected for ${model} (400). Retrying without json_object constraint...`);
                            continue;
                        }

                        // For rate limits (429) or other errors, try next model
                        if (response.status === 429) {
                            console.warn(`Groq rate limit hit on ${model}. Trying next fallback model...`);
                            break;
                        }

                        throw lastError;
                    }

                    const data = await response.json();
                    const text = data?.choices?.[0]?.message?.content;

                    if (!text) {
                        console.error('Groq Raw Response data:', data);
                        throw new Error('No response content from Groq API');
                    }

                    const parsed = parseOrRepairJson(text);
                    if (parsed) {
                        return parsed;
                    }

                    console.error('Failed to parse Groq response as JSON. Raw text:', text);
                    throw new Error('Failed to parse Groq API response as JSON. See console for details.');
                } catch (err) {
                    lastError = err;
                    if (err.message && (err.message.includes('404') || err.message.includes('429'))) {
                        break;
                    }
                    // If this was format attempt 1, loop will retry with format option 2
                }
            }
        }

        throw lastError || new Error('All Groq model candidates failed to respond.');
    },
};


// ========================
// Unified Client Export
// ========================

export const voyager = {
    auth: AuthService,
    entities: {
        Trip: TripService,
    },
    integrations: {
        Core: AIService,
    },
};
