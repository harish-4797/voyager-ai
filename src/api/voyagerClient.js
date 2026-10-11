/**
 * VoyagerClient — data + AI access for the app.
 *
 * Two storage backends behind one API:
 *  - Cloud mode (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set): Supabase Auth + Postgres
 *    (profiles and trips tables, protected by Row Level Security — see supabase/schema.sql)
 *  - Local mode (no Supabase config): everything in this browser's localStorage
 *
 * AI calls always go through our own /api/groq proxy.
 */
import { getAccessToken, isCloud, supabase } from '@/lib/supabase';

// ========================
// Local mode (localStorage)
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

const LocalTripService = {
    /** List trips, sorted by a field. Supports "-field" for descending order. */
    async list(sortBy = '-created_date', limit = 50) {
        const trips = getTrips();
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

    /** Filter trips by criteria (e.g., { id: "abc123" }). */
    async filter(criteria) {
        return getTrips().filter((trip) => Object.entries(criteria).every(([key, value]) => trip[key] === value));
    },

    async create(data) {
        const trips = getTrips();
        const newTrip = { ...data, id: generateId(), created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
        trips.push(newTrip);
        saveTrips(trips);
        return newTrip;
    },

    async update(id, data) {
        const trips = getTrips();
        const index = trips.findIndex((t) => t.id === id);
        if (index === -1) throw new Error('Trip not found');
        trips[index] = { ...trips[index], ...data, updated_date: new Date().toISOString() };
        saveTrips(trips);
        return trips[index];
    },

    async delete(id) {
        saveTrips(getTrips().filter((t) => t.id !== id));
        return true;
    },
};

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

const LocalAuthService = {
    async me() {
        return getUserPrefs();
    },
    async updateMe(data) {
        const updated = { ...getUserPrefs(), ...data };
        localStorage.setItem(USER_PREFS_KEY, JSON.stringify(updated));
        return updated;
    },
    async logout() {},
};

// ========================
// Cloud mode (Supabase)
// ========================

const TRIP_COLUMNS = ['title', 'city', 'country', 'days', 'budget', 'month', 'start_date', 'interests', 'status', 'itinerary', 'packing_list'];
const PROFILE_COLUMNS = [
    'full_name', 'travel_style', 'dietary_restrictions', 'preferred_budget_range',
    'home_airport', 'avoided_activities', 'past_trips_summary',
];

const pick = (data, columns) => Object.fromEntries(Object.entries(data).filter(([k, v]) => columns.includes(k) && v !== undefined));

/** Postgres can't store "" in a date column. */
function toTripRow(data) {
    const row = pick(data, TRIP_COLUMNS);
    if ('start_date' in row && !row.start_date) row.start_date = null;
    if ('budget' in row) row.budget = Math.round(Number(row.budget) || 0);
    return row;
}

function check({ data, error }) {
    if (error) throw new Error(error.message);
    return data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CloudTripService = {
    async list(sortBy = '-created_date', limit = 50) {
        const desc = sortBy.startsWith('-');
        const field = desc ? sortBy.slice(1) : sortBy;
        return check(await supabase.from('trips').select('*').order(field, { ascending: !desc }).limit(limit));
    },

    async filter(criteria) {
        // Old local-mode links use non-UUID ids; they can't exist in the database.
        if (criteria.id && !UUID.test(criteria.id)) return [];
        return check(await supabase.from('trips').select('*').match(criteria));
    },

    async create(data) {
        return check(await supabase.from('trips').insert(toTripRow(data)).select().single());
    },

    async update(id, data) {
        return check(await supabase.from('trips').update(toTripRow(data)).eq('id', id).select().single());
    },

    async delete(id) {
        check(await supabase.from('trips').delete().eq('id', id));
        return true;
    },
};

async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
}

const CloudAuthService = {
    /** The signed-in user's profile merged with their account details. Throws when signed out. */
    async me() {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const profile = check(await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()) || {};
        return {
            ...DEFAULT_USER,
            ...profile,
            id: user.id,
            email: user.email,
            full_name: profile.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
            created_at: user.created_at,
        };
    },

    async updateMe(data) {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        check(await supabase.from('profiles').upsert({ id: user.id, ...pick(data, PROFILE_COLUMNS) }));
        return this.me();
    },

    async signIn(email, password) {
        return check(await supabase.auth.signInWithPassword({ email, password }));
    },

    async signUp(email, password, fullName) {
        return check(
            await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/Login` },
            })
        );
    },

    async resetPassword(email) {
        return check(await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/Login?reset=1` }));
    },

    async updatePassword(password) {
        return check(await supabase.auth.updateUser({ password }));
    },

    async logout() {
        await supabase.auth.signOut();
    },
};

/** Trips saved in this browser (local mode) that can be moved into the user's account. */
const LocalImport = {
    count() {
        return getTrips().length;
    },

    async importToCloud() {
        const trips = getTrips();
        let imported = 0;
        for (const trip of trips) {
            const row = toTripRow(trip);
            if (trip.created_date) row.created_date = trip.created_date;
            check(await supabase.from('trips').insert(row));
            imported++;
        }
        localStorage.removeItem(TRIPS_STORAGE_KEY);
        return imported;
    },

    dismiss() {
        localStorage.removeItem(TRIPS_STORAGE_KEY);
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
        // In cloud mode the proxy only serves signed-in users.
        const token = await getAccessToken();
        const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        for (const model of CANDIDATE_MODELS) {
            // First attempt: with response_format (if requested)
            // Second attempt: without response_format if Groq 400 "Failed to generate JSON" occurs
            const formatOptions = response_json_schema ? [{ type: 'json_object' }, undefined] : [undefined];

            for (const format of formatOptions) {
                try {
                    const response = await fetch(AI_ENDPOINT, {
                        method: 'POST',
                        headers,
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

                        if (response.status === 401) {
                            // Not signed in — retrying other models won't help.
                            throw Object.assign(new Error('Please sign in to generate itineraries.'), { fatal: true });
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
                    if (err.fatal) throw err;
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
    /** "cloud" when Supabase is configured, otherwise "local". */
    mode: isCloud ? 'cloud' : 'local',
    auth: isCloud ? CloudAuthService : LocalAuthService,
    entities: {
        Trip: isCloud ? CloudTripService : LocalTripService,
    },
    integrations: {
        Core: AIService,
    },
    local: LocalImport,
};
