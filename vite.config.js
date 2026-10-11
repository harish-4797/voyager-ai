import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

/**
 * Serves POST /api/groq from the local dev and preview servers using the same proxy
 * code as the Vercel function, so `npm run dev` works without exposing the key.
 */
function groqApiProxy(env) {
  const middleware = async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    let body = null
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
    } catch {
      /* invalid JSON → proxy returns 400 */
    }
    const { proxyGroq } = await import('./api/_groq-core.js')
    let result
    try {
      result = await proxyGroq({
        method: req.method,
        body,
        apiKey: env.GROQ_API_KEY,
        ip: 'local',
        origin: req.headers.origin,
        host: req.headers.host,
        extraModels: [env.GROQ_MODEL, env.VITE_GROQ_MODEL],
      })
    } catch (err) {
      result = { status: 502, json: { error: { message: `Could not reach Groq: ${err.message}` } } }
    }
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result.json))
  }
  return {
    name: 'groq-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/groq', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/groq', middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' prefix loads all variables (including the server-only GROQ_API_KEY) for the proxy;
  // only VITE_-prefixed ones are ever exposed to the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    logLevel: 'info',
    plugins: [react(), groqApiProxy(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
