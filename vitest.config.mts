import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Test minimi della logica pura in `src/lib`: ambiente node, alias `@` come in tsconfig.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
