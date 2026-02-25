/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';

/**
 * Vitest config for e2e CRDT collaboration tests.
 * These tests use real Y.Doc instances (no mocks) and are excluded from
 * the main vitest config. Run with:
 *   npx vitest run --config tests/e2e/vitest.config.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/collaboration-stress.test.ts'],
    root: path.resolve(__dirname, '../..'),
    reporters: ['verbose'],
  },
});
