/**
 * Feature Flag Client Service Tests
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock apiService before importing the service
vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

import { apiService } from '@/services/apiService';

describe('featureFlagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches flags from API and caches them', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      success: true,
      data: { 'new-dashboard': true, 'ai-copilot': false },
    });

    const { getFlags } = await import('../featureFlagService');
    const flags = await getFlags();

    expect(flags).toEqual({ 'new-dashboard': true, 'ai-copilot': false });
    expect(apiService.get).toHaveBeenCalledTimes(1);
    expect(apiService.get).toHaveBeenCalledWith('/admin/flags/evaluate');
  });

  it('returns cached flags on subsequent calls within TTL', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      success: true,
      data: { 'test-flag': true },
    });

    const { getFlags } = await import('../featureFlagService');

    const first = await getFlags();
    const second = await getFlags();

    expect(first).toEqual(second);
    expect(apiService.get).toHaveBeenCalledTimes(1); // Only one fetch
  });

  it('returns stale cache on network error', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { 'cached-flag': true },
      });

    const { getFlags, refreshFlags } = await import('../featureFlagService');

    // First call succeeds
    await getFlags();

    // Force refresh, but network fails
    vi.mocked(apiService.get).mockRejectedValueOnce(new Error('Network error'));
    const flags = await refreshFlags();

    expect(flags).toEqual({ 'cached-flag': true }); // Stale cache returned
  });

  it('getFlagSync returns false for unknown flags', async () => {
    const { getFlagSync } = await import('../featureFlagService');
    expect(getFlagSync('nonexistent-flag')).toBe(false);
  });

  it('subscribe notifies listeners on flag changes', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      success: true,
      data: { 'notify-flag': true },
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
