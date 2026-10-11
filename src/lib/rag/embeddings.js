/**
 * RAG — dense retrieval support.
 * Embeds text in a Web Worker (all-MiniLM-L6-v2, 384-d, normalised) and caches document
 * vectors in IndexedDB, so each place is embedded once per browser. Vector search itself is
 * an in-memory cosine similarity over the city's ~100–300 places.
 */

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const BATCH = 32;
const DB_NAME = "voyager-embeddings";
const STORE = "vectors";

let worker = null;
let seq = 0;
const pending = new Map();
let modelState = "idle"; // idle | loading | ready | failed

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./embed.worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "progress") return;
    const job = pending.get(data.id);
    if (!job) return;
    pending.delete(data.id);
    if (data.type === "error") job.reject(new Error(data.message));
    else job.resolve(data);
  };
  worker.onerror = (e) => {
    modelState = "failed";
    pending.forEach((job) => job.reject(new Error(e.message || "Embedding worker crashed")));
    pending.clear();
  };
  return worker;
}

function call(type, texts) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, type, texts });
  });
}

/** Starts downloading/initialising the model in the background (safe to call repeatedly). */
export function warmupEmbeddings() {
  if (modelState !== "idle") return;
  modelState = "loading";
  call("warmup")
    .then(() => (modelState = "ready"))
    .catch(() => (modelState = "failed"));
}

export const isEmbeddingModelReady = () => modelState === "ready";

/** Embeds texts → array of Float32Array(384), L2-normalised. */
export async function embedTexts(texts) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const { data, dims } = await call("embed", batch);
    const size = dims[dims.length - 1];
    for (let j = 0; j < batch.length; j++) vectors.push(data.slice(j * size, (j + 1) * size));
  }
  modelState = "ready";
  return vectors;
}

// ---------- IndexedDB vector cache ----------
let dbPromise = null;
function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getMany(keys) {
  try {
    const db = await openDb();
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    return await Promise.all(
      keys.map(
        (k) =>
          new Promise((resolve) => {
            const r = store.get(k);
            r.onsuccess = () => resolve(r.result || null);
            r.onerror = () => resolve(null);
          })
      )
    );
  } catch {
    return keys.map(() => null);
  }
}

async function putMany(entries) {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    entries.forEach(([k, v]) => tx.objectStore(STORE).put(v, k));
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {
    /* caching is best-effort */
  }
}

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Text used to represent a place in vector space. */
export const placeText = (d) => [d.name, d.label, d.description, d.cuisine && `cuisine: ${d.cuisine}`].filter(Boolean).join(". ");

/** Returns Map(doc.id → vector), embedding only documents not already cached. */
export async function embedPlaces(docs) {
  const texts = docs.map(placeText);
  const keys = docs.map((d, i) => `${EMBEDDING_MODEL}|${d.id}|${hash(texts[i])}`);
  const cached = await getMany(keys);
  const missing = docs.map((_, i) => i).filter((i) => !cached[i]);
  if (missing.length) {
    const fresh = await embedTexts(missing.map((i) => texts[i]));
    missing.forEach((i, j) => (cached[i] = fresh[j]));
    await putMany(missing.map((i) => [keys[i], cached[i]]));
  }
  return new Map(docs.map((d, i) => [d.id, cached[i]]));
}

/** Cosine similarity of two normalised vectors (= dot product). */
export function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Semantic similarity of every document to the query.
 * @returns {Promise<Map<string, number>>} doc.id → cosine similarity
 */
export async function semanticScores(docs, queryText) {
  const [queryVec] = await embedTexts([queryText]);
  const vectors = await embedPlaces(docs);
  return new Map(docs.map((d) => [d.id, cosine(queryVec, vectors.get(d.id))]));
}

export function withTimeout(promise, ms, label = "operation") {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms))]);
}
