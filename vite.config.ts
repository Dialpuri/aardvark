/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { mockAardvark } from './vite/mockAardvark.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Point `/api` at a real Aardvark backend by setting `VITE_AARDVARK_PROXY`
  // (e.g. in `.env.local`, `VITE_AARDVARK_PROXY=http://localhost:8080`). When
  // set, the dev server proxies `/api/*` — HTTP and websocket — to it and the
  // mock is switched off; when unset, requests are answered by the mock.
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_AARDVARK_PROXY
  const mockResultJson = env.MOCK_AARDVARK_RESULT_JSON

  return {
    base: '/aardvark/',
    plugins: [
      react(),
      ...(backend ? [] : [mockAardvark(mockResultJson || undefined)]),
    ],
    server: backend
      ? {
          proxy: {
            '/api': {
              target: backend,
              changeOrigin: true,
              ws: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          },
        }
      : undefined,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: [
          '**/*.config.*',
          '**/test/**',
          '**/*.d.ts',
          'src/main.tsx',
          'src/router.tsx',
        ],
      },
    },
  }
})
