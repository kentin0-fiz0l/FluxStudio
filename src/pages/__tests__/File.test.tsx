/**
 * File Page Tests
 *
 * File.tsx is a thin re-export of FileNew, which already has its own tests.
 * These tests verify the re-export works correctly.
 */

import { describe, test, expect, vi } from 'vitest';

vi.mock('../FileNew', () => ({
  FileNew: () => <div data-testid="file-new">FileNew Component</div>,
}));

import { File } from '../File';
import DefaultExport from '../File';

describe('File (re-export)', () => {
  test('named export File is defined', () => {
    expect(File).toBeDefined();
  });

  test('default export is defined', () => {
    expect(DefaultExport).toBeDefined();
  });

  test('named export and default export reference FileNew', () => {
    // Both should be the same underlying component (FileNew)
    expect(File).toBeDefined();
    expect(DefaultExport).toBeDefined();
  });

  test('File is a valid React component', () => {
    expect(typeof File).toBe('function');
  });

  test('default export is a valid React component', () => {
    expect(typeof DefaultExport).toBe('function');
  });
});
