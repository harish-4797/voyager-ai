/**
 * Web Worker that turns text into sentence embeddings with all-MiniLM-L6-v2 (384 dims),
 * running fully in the browser via transformers.js. Kept off the main thread so the UI
 * stays smooth while the model loads (~23 MB, cached by the browser after the first time).
 */
import { env, pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor = null;

function load() {
  extractor ??= pipeline("feature-extraction", MODEL, {
    dtype: "q8",
    progress_callback: (p) => {
      if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, progress: p.progress });
    },
  });
  return extractor;
}

self.onmessage = async ({ data }) => {
  const { id, type, texts } = data;
  try {
    const model = await load();
    if (type === "warmup") {
      self.postMessage({ id, type: "ready" });
      return;
    }
    const output = await model(texts, { pooling: "mean", normalize: true });
    const vectors = output.data; // Float32Array of length texts.length * 384
    self.postMessage({ id, type: "result", dims: output.dims, data: vectors }, [vectors.buffer]);
  } catch (err) {
    self.postMessage({ id, type: "error", message: err?.message || String(err) });
  }
};
