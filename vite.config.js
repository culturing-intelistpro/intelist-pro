import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Dev-only: runs api/*.js (Vercel serverless functions) inside the Vite dev
// server so `npm run dev` works locally without `vercel dev`. Not used by
// `vite build` / the Vercel deployment — those serve api/*.js natively.
function localApiMiddleware() {
  const routes = {
    '/api/autocomplete': './api/autocomplete.js',
    '/api/anthropic':    './api/anthropic.js',
    '/api/directions':   './api/directions.js',
    '/api/nearby':       './api/nearby.js',
  }
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const modPath = routes[req.url]
        if (!modPath || req.method !== 'POST') return next()

        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', async () => {
          try {
            req.body = raw ? JSON.parse(raw) : {}
            const absUrl = pathToFileURL(path.resolve(process.cwd(), modPath)).href
            const { default: handler } = await import(/* @vite-ignore */ absUrl)
            await handler(req, {
              statusCode: 200,
              setHeader: (name, val) => res.setHeader(name, val),
              status(code) { this.statusCode = code; return this },
              json(obj) {
                res.statusCode = this.statusCode
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(obj))
              },
            })
          } catch (err) {
            console.error(`[local-api-middleware] ${req.url} error:`, err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Vite's own env loading only exposes VITE_-prefixed vars to import.meta.env;
  // api/*.js reads plain process.env (as it does on Vercel), so load everything
  // from .env into process.env for the dev server process.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), localApiMiddleware()],
    server: {
      proxy: {
        '/api/nominatim': {
          target: 'https://nominatim.openstreetmap.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
          headers: {
            'User-Agent': 'IntelistPro/1.0 (real estate listing tool)',
          },
        },
        '/api/places': {
          target: 'https://places.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/places/, '/v1/places'),
        },
      },
    },
  }
})
