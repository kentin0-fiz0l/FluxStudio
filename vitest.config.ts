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
      'tests/integration/**',  // Integration tests require running infrastructure
      '**/*.e2e.*',
      '**/*.spec.ts',
      '**/*.integration.*',  // Integration tests marked with .integration.
      'services/**',
      'flux-mcp/**',
      'apps/**/node_modules/**',
      'packages/**/node_modules/**',
      'lib/**/__tests__/**',  // Backend lib tests require database
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