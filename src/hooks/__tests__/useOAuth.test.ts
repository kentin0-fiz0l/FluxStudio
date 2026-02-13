/**
 * Unit Tests for useOAuth hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../../services/integrationService', () => ({
  integrationService: {
    getIntegration: vi.fn(),
    startAuthorization: vi.fn(),
    disconnect: vi.fn(),
    refresh: vi.fn(),
  },
}));

describe('useOAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh)',
      writable: true,
      configurable: true,
    });
    // Mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should initialize with disconnected state', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('github'));

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should check existing connection on mount', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'connected',
      provider: 'github',
    });

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('github'));

    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });

  it('should detect expired connection', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'expired',
      provider: 'github',
    });

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('github'));

    await waitFor(() => expect(result.current.error?.code).toBe('TOKEN_EXPIRED'));
  });

  it('should disconnect from integration', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'connected',
      provider: 'github',
    });
    (integrationService.disconnect as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('github'));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.integration).toBeNull();
  });

  it('should handle disconnect error', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'connected',
      provider: 'github',
    });
    (integrationService.disconnect as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Disconnect failed')
    );

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('github'));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.error?.code).toBe('NETWORK_ERROR');
  });

  it('should clear error', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'expired',
      provider: 'figma',
    });

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('figma'));

    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should reconnect with token refresh', async () => {
    const { integrationService } = await import('../../services/integrationService');
    (integrationService.getIntegration as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'expired',
      provider: 'slack',
    });
    const refreshedIntegration = { status: 'connected', provider: 'slack' };
    (integrationService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue(refreshedIntegration);

    const { useOAuth } = await import('../useOAuth');
    const { result } = renderHook(() => useOAuth('slack'));

    await waitFor(() => expect(result.current.error).not.toBeNull());

    await act(async () => {
      await result.current.reconnect();
    });

    expect(result.current.isConnected).toBe(true);
  });
});
