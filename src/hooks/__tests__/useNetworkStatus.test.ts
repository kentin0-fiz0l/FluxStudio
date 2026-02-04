/**
 * Unit Tests for useNetworkStatus Hook
 * @file src/hooks/__tests__/useNetworkStatus.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

describe('useNetworkStatus', () => {
  let onlineEventListener: (() => void) | null = null;
  let offlineEventListener: (() => void) | null = null;
  // Used in mock connection listener callback (assigned but not read - intentional)
  let connectionChangeListener: (() => void) | null = null;
  void connectionChangeListener; // Suppress unused variable warning

  const mockAddEventListener = vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
    const handlerFn = typeof handler === 'function' ? handler : handler.handleEvent.bind(handler);
    if (event === 'online') onlineEventListener = handlerFn as () => void;
    if (event === 'offline') offlineEventListener = handlerFn as () => void;
  }) as unknown as typeof window.addEventListener;

  const mockRemoveEventListener = vi.fn() as unknown as typeof window.removeEventListener;

  beforeEach(() => {
    vi.clearAllMocks();
    onlineEventListener = null;
    offlineEventListener = null;

    // Mock window event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation(mockAddEventListener);
    vi.spyOn(window, 'removeEventListener').mockImplementation(mockRemoveEventListener);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return online status when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.quality).toBe('online');
    });

    it('should return offline status when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.quality).toBe('offline');
    });
  });

  describe('Event Listeners', () => {
    it('should add online and offline event listeners on mount', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      renderHook(() => useNetworkStatus());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { unmount } = renderHook(() => useNetworkStatus());
      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should update isOnline when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        if (onlineEventListener) onlineEventListener();
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should update isOnline when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        if (offlineEventListener) offlineEventListener();
      });

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Network Information API', () => {
    it('should return null values when Network Information API is not available', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.effectiveType).toBeNull();
      expect(result.current.downlink).toBeNull();
      expect(result.current.rtt).toBeNull();
      expect(result.current.saveData).toBe(false);
    });

    it('should return connection info when Network Information API is available', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'change') connectionChangeListener = handler;
        }),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.effectiveType).toBe('4g');
      expect(result.current.downlink).toBe(10);
      expect(result.current.rtt).toBe(50);
      expect(result.current.saveData).toBe(false);
    });
  });

  describe('Network Quality', () => {
    it('should return "offline" quality when not online', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.quality).toBe('offline');
    });

    it('should return "slow" quality for slow-2g connection', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: 'slow-2g',
        downlink: 0.1,
        rtt: 2000,
        saveData: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.quality).toBe('slow');
    });

    it('should return "slow" quality for 2g connection', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: '2g',
        downlink: 0.3,
        rtt: 1000,
        saveData: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.quality).toBe('slow');
    });

    it('should return "slow" quality when downlink is below 1 Mbps', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: '3g',
        downlink: 0.5,
        rtt: 200,
        saveData: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.quality).toBe('slow');
    });

    it('should return "slow" quality when RTT is above 500ms', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: '3g',
        downlink: 2,
        rtt: 600,
        saveData: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.quality).toBe('slow');
    });

    it('should return "online" quality for good connection', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.quality).toBe('online');
    });
  });

  describe('Save Data Mode', () => {
    it('should return saveData status from Network Information API', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.saveData).toBe(true);
    });
  });
});
