/**
 * Organization Page Tests
 *
 * Organization.tsx is a thin re-export of OrganizationNew, which already has its own tests.
 * These tests verify the re-export works correctly.
 */

import { describe, test, expect, vi } from 'vitest';

vi.mock('../OrganizationNew', () => ({
  OrganizationNew: () => <div data-testid="org-new">OrganizationNew Component</div>,
}));

import { Organization } from '../Organization';
import DefaultExport from '../Organization';

describe('Organization (re-export)', () => {
  test('named export Organization is defined', () => {
    expect(Organization).toBeDefined();
  });

  test('default export is defined', () => {
    expect(DefaultExport).toBeDefined();
  });

  test('Organization is a valid React component', () => {
    expect(typeof Organization).toBe('function');
  });

  test('default export is a valid React component', () => {
    expect(typeof DefaultExport).toBe('function');
  });

  test('module exports are consistent', async () => {
    const mod = await import('../Organization');
    expect(mod.Organization).toBeDefined();
    expect(mod.default).toBeDefined();
  });
});
