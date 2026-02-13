/**
 * Unit Tests for useGoogleOAuth hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockManager = {
  preload: vi.fn(),
  initialize: vi.fn(),
  createButton: vi.fn(),
  removeButton: vi.fn(),
  cleanup: vi.fn(),
  getStatus: vi.fn(() => ({ ready: true })),
};

vi.mock('../../services/GoogleOAuthManager', () => ({
  default: {
    getInstance: () => mockManager,
  },
}));

describe('useGoogleOAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockManager.initialize.mockResolvedValue(undefined);
    mockManager.preload.mockResolvedValue(undefined);
  });

  it('should initialize Google OAuth', async () => {
    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'test-client-id' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockManager.initialize).toHaveBeenCalledWith({ clientId: 'test-client-id' });
  });

  it('should preload when option is set', async () => {
    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'test-id', preload: true }));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(mockManager.preload).toHaveBeenCalled();
  });

  it('should handle initialization error', async () => {
    mockManager.initialize.mockRejectedValue(new Error('GSI script failed'));

    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'bad-id' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('GSI script failed');
    expect(result.current.isReady).toBe(false);
  });

  it('should create and remove button', async () => {
    mockManager.createButton.mockResolvedValue('button-123');

    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'test-id' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    let buttonId: string = '';
    await act(async () => {
      buttonId = await result.current.createButton('container', {
        onSuccess: vi.fn(),
      });
    });

    expect(buttonId).toBe('button-123');

    act(() => {
      result.current.removeButton('container');
    });

    expect(mockManager.removeButton).toHaveBeenCalledWith('container');
  });

  it('should throw when creating button before ready', async () => {
    mockManager.initialize.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'test-id' }));

    await expect(
      result.current.createButton('container', { onSuccess: vi.fn() })
    ).rejects.toThrow('Google OAuth not ready');
  });

  it('should cleanup manager', async () => {
    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'test-id' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.cleanup();
    });

    expect(mockManager.cleanup).toHaveBeenCalled();
    expect(result.current.isReady).toBe(false);
  });

  it('should get status from manager', async () => {
    const { useGoogleOAuth } = await import('../useGoogleOAuth');
    const { result } = renderHook(() => useGoogleOAuth({ clientId: 'test-id' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const status = result.current.getStatus();
    expect(status).toEqual({ ready: true });
  });
});
