/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { mockAnalyze } from './vite/mockAnalyze.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/aardvark/',
  plugins: [react(), mockAnalyze()],
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
})
