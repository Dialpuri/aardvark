import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Dev-only stand-in for the COD geometry server. Answers `POST /api/analyze`
 * with the captured sample response, ignoring the posted structure (any
 * format) — enough to exercise the client wrap/request path end to end.
 * Swap in the real server by setting `VITE_ANALYZE_URL`.
 */
export function mockAnalyze(): Plugin {
  const samplePath = fileURLToPath(
    new URL('../public/sample/A1C3B.json', import.meta.url),
  )

  return {
    name: 'mock-analyze',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/analyze', (req, res, next) => {
        if (req.method !== 'POST') return next()
        // Drain the request body so the socket closes, then reply.
        req.on('data', () => {})
        req.on('end', () => {
          void readFile(samplePath, 'utf8').then(
            (body) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(body)
            },
            (err: unknown) => {
              res.statusCode = 500
              res.end(String(err))
            },
          )
        })
      })
    },
  }
}
