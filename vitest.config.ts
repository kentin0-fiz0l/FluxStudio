/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    reporters: ['verbose'],
    exclude: [
      '**/node_modules/**',
      'tests/e2e/**',
      'tests/load/**',
      '**/*.e2e.*',
      '**/*.spec.ts',
      'services/**',
      'flux-mcp/**',
      'apps/**/node_modules/**',
      'packages/**/node_modules/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*'
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        'src/main.tsx'
      ]
    }
  },
})