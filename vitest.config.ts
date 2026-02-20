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
      'cli/**',  // CLI uses node:test, not Vitest
      'tests/e2e/**',
      'tests/load/**',
      'tests/integration/**',  // Integration tests require running infrastructure
      'tests/routes/**',  // Route tests use Jest, not Vitest
      'tests/unit/**',  // Unit tests in tests/ folder use Jest
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
      ],
      thresholds: {
        branches: 65,
        functions: 70,
        lines: 75,
        statements: 75,
      },
    }
  },
})