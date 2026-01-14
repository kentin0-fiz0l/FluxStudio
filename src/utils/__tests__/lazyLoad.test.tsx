/**
 * Unit Tests - Lazy Loading Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { lazyLoadWithRetry, preloadComponents, usePreloadOnInteraction } from '../lazyLoad';
import React from 'react';

describe('lazyLoad utilities', () => {
  describe('lazyLoadWithRetry', () => {
    it('should successfully load component on first attempt', async () => {
      const mockComponent = () => <div>Test Component</div>;
      const importFn = vi.fn(() => Promise.resolve({ default: mockComponent }));

      const { Component } = lazyLoadWithRetry(importFn);

      const TestWrapper = () => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>
      );

      render(<TestWrapper />);

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should load component
      await waitFor(() => {
        expect(screen.getByText('Test Component')).toBeInTheDocument();
      });

      // Should only call import once
      expect(importFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockComponent = () => <div>Test Component</div>;
      let attemptCount = 0;

      const importFn = vi.fn(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ default: mockComponent });
      });

      const { Component } = lazyLoadWithRetry(importFn, {
        retryAttempts: 3,
        retryDelay: 100,
      });

      const TestWrapper = () => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>
      );

      render(<TestWrapper />);

      // Should eventually load after retry
      await waitFor(
        () => {
          expect(screen.getByText('Test Component')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should have called import twice (failed once, succeeded once)
      expect(importFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      const importFn = vi.fn(() => Promise.reject(new Error('Network error')));

      const { preload } = lazyLoadWithRetry(importFn, {
        retryAttempts: 2,
        retryDelay: 50,
      });

      // Suppress error warnings
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test preload directly - it should reject after max retries
      await expect(preload()).rejects.toThrow('Network error');

      consoleError.mockRestore();
      consoleWarn.mockRestore();

      // Should have called import 2 times (max retries)
      expect(importFn).toHaveBeenCalledTimes(2);
    });

    it('should support preload functionality', async () => {
      const mockComponent = () => <div>Test Component</div>;
      const importFn = vi.fn(() => Promise.resolve({ default: mockComponent }));

      const { preload } = lazyLoadWithRetry(importFn);

      // Preload the component
      await preload();

      // Should have called import once
      expect(importFn).toHaveBeenCalledTimes(1);

      // Calling preload again should not trigger another import
      await preload();
      expect(importFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('preloadComponents', () => {
    it('should preload multiple components in parallel', async () => {
      const component1 = vi.fn(() => Promise.resolve({ default: () => <div>1</div> }));
      const component2 = vi.fn(() => Promise.resolve({ default: () => <div>2</div> }));
      const component3 = vi.fn(() => Promise.resolve({ default: () => <div>3</div> }));

      const loadable1 = lazyLoadWithRetry(component1);
      const loadable2 = lazyLoadWithRetry(component2);
      const loadable3 = lazyLoadWithRetry(component3);

      const startTime = Date.now();
      await preloadComponents([loadable1, loadable2, loadable3]);
      const endTime = Date.now();

      // All should be loaded
      expect(component1).toHaveBeenCalled();
      expect(component2).toHaveBeenCalled();
      expect(component3).toHaveBeenCalled();

      // Should be parallel (total time < sum of individual times)
      expect(endTime - startTime).toBeLessThan(300); // Assuming each takes ~100ms
    });

    it('should handle preload failures gracefully', async () => {
      const component1 = vi.fn(() => Promise.resolve({ default: () => <div>1</div> }));
      const component2 = vi.fn(() => Promise.reject(new Error('Failed')));

      const loadable1 = lazyLoadWithRetry(component1);
      const loadable2 = lazyLoadWithRetry(component2, { retryAttempts: 1 });

      // Should not throw, just log error
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(preloadComponents([loadable1, loadable2])).resolves.not.toThrow();

      consoleError.mockRestore();
    });
  });

  describe('usePreloadOnInteraction', () => {
    it('should preload on mouse enter', async () => {
      const preloadFn = vi.fn(() => Promise.resolve());

      const TestComponent = () => {
        const props = usePreloadOnInteraction(preloadFn);
        return <button {...props}>Hover me</button>;
      };

      const { getByText } = render(<TestComponent />);
      const button = getByText('Hover me');

      // Should not preload initially
      expect(preloadFn).not.toHaveBeenCalled();

      // Trigger mouse enter using fireEvent
      fireEvent.mouseEnter(button);

      // Should preload
      await waitFor(() => {
        expect(preloadFn).toHaveBeenCalledTimes(1);
      });

      // Hovering again should not trigger another preload
      fireEvent.mouseEnter(button);
      expect(preloadFn).toHaveBeenCalledTimes(1);
    });

    it('should preload on focus', async () => {
      const preloadFn = vi.fn(() => Promise.resolve());

      const TestComponent = () => {
        const props = usePreloadOnInteraction(preloadFn);
        return <button {...props}>Focus me</button>;
      };

      const { getByText } = render(<TestComponent />);
      const button = getByText('Focus me');

      // Trigger focus
      button.focus();

      // Should preload
      await waitFor(() => {
        expect(preloadFn).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle preload errors gracefully', async () => {
      const preloadFn = vi.fn(() => Promise.reject(new Error('Preload failed')));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const props = usePreloadOnInteraction(preloadFn);
        return <button {...props}>Hover me</button>;
      };

      const { getByText } = render(<TestComponent />);
      const button = getByText('Hover me');

      // Trigger mouse enter using fireEvent
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(preloadFn).toHaveBeenCalled();
      });

      // Should not crash and should log error
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });
});
