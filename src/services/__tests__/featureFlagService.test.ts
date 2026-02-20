/**
 * Feature Flag Client Service Tests
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env
vi.stubEnv('VITE_API_URL', 'http://localhost:3001');

// We need to mock fetch before importing the service
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const storage: Record<string, string> = { accessToken: 'test-token-123' };
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
});

describe('featureFlagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches flags from API and caches them', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'new-dashboard': true, 'ai-copilot': false }),
    });

    const { getFlags } = await import('../featureFlagService');
    const flags = await getFlags();

    expect(flags).toEqual({ 'new-dashboard': true, 'ai-copilot': false });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/flags/evaluate'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token-123' }),
      })
    );
  });

  it('returns cached flags on subsequent calls within TTL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'test-flag': true }),
    });

    const { getFlags } = await import('../featureFlagService');

    const first = await getFlags();
    const second = await getFlags();

    expect(first).toEqual(second);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch
  });

  it('returns stale cache on network error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'cached-flag': true }),
      });

    const { getFlags, refreshFlags } = await import('../featureFlagService');

    // First call succeeds
    await getFlags();

    // Force refresh, but network fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const flags = await refreshFlags();

    expect(flags).toEqual({ 'cached-flag': true }); // Stale cache returned
  });

  it('getFlagSync returns false for unknown flags', async () => {
    const { getFlagSync } = await import('../featureFlagService');
    expect(getFlagSync('nonexistent-flag')).toBe(false);
  });

  it('subscribe notifies listeners on flag changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 'notify-flag': true }),
    });

    const { getFlags, subscribe } = await import('../featureFlagService');

    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    await getFlags();

    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it('getSnapshot returns current flag state', async () => {
    const { getSnapshot } = await import('../featureFlagService');
    const snapshot = getSnapshot();
    expect(typeof snapshot).toBe('object');
  });
});
