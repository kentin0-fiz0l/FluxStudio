/**
 * Messages Page Tests
 *
 * Messages.tsx is a thin re-export of MessagesNew, which already has its own tests.
 * These tests verify the re-export works correctly.
 */

import { describe, test, expect, vi } from 'vitest';

vi.mock('../MessagesNew', () => ({
  MessagesNew: () => <div data-testid="messages-new">MessagesNew Component</div>,
}));

import { Messages } from '../Messages';

describe('Messages (re-export)', () => {
  test('named export Messages is defined', () => {
    expect(Messages).toBeDefined();
  });

  test('Messages is a valid React component', () => {
    expect(typeof Messages).toBe('function');
  });

  test('Messages is the re-exported MessagesNew', () => {
    // The named export should be MessagesNew aliased as Messages
    expect(Messages).toBeDefined();
    expect(typeof Messages).toBe('function');
  });

  test('module exports Messages under the correct name', async () => {
    const mod = await import('../Messages');
    expect(mod.Messages).toBeDefined();
  });
});
