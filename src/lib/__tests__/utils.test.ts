/**
 * Unit Tests for Utility Functions
 * @file src/lib/__tests__/utils.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  safeGetTime,
  safeDate,
  formatRelativeTime,
  formatFileSize,
  generateId,
  debounce,
  throttle,
} from '../utils';

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const falseCondition = false;
    const trueCondition = true;
    expect(cn('foo', falseCondition && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', trueCondition && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should merge Tailwind conflicting classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects with conditional classes', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null, undefined)).toBe('');
  });
});

describe('safeGetTime', () => {
  it('should return timestamp from valid Date object', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(safeGetTime(date)).toBe(date.getTime());
  });

  it('should return timestamp from valid date string', () => {
    const dateString = '2024-01-15T12:00:00Z';
    expect(safeGetTime(dateString)).toBe(new Date(dateString).getTime());
  });

  it('should return timestamp from valid number', () => {
    const timestamp = 1705320000000;
    expect(safeGetTime(timestamp)).toBe(timestamp);
  });

  it('should return 0 for undefined', () => {
    expect(safeGetTime(undefined)).toBe(0);
  });

  it('should return 0 for invalid date string', () => {
    expect(safeGetTime('invalid-date')).toBe(0);
  });
});

describe('safeDate', () => {
  it('should return Date object from valid Date', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(safeDate(date)).toEqual(date);
  });

  it('should return Date object from valid string', () => {
    const dateString = '2024-01-15T12:00:00Z';
    expect(safeDate(dateString).getTime()).toBe(new Date(dateString).getTime());
  });

  it('should return Date object from timestamp', () => {
    const timestamp = 1705320000000;
    expect(safeDate(timestamp).getTime()).toBe(timestamp);
  });

  it('should return epoch date for undefined', () => {
    expect(safeDate(undefined).getTime()).toBe(0);
  });

  it('should return epoch date for invalid string', () => {
    expect(safeDate('invalid-date').getTime()).toBe(0);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for recent times', () => {
    const date = new Date('2024-01-15T11:59:30Z'); // 30 seconds ago
    expect(formatRelativeTime(date)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const date = new Date('2024-01-15T11:45:00Z'); // 15 minutes ago
    expect(formatRelativeTime(date)).toBe('15m ago');
  });

  it('should return hours ago', () => {
    const date = new Date('2024-01-15T08:00:00Z'); // 4 hours ago
    expect(formatRelativeTime(date)).toBe('4h ago');
  });

  it('should return days ago', () => {
    const date = new Date('2024-01-12T12:00:00Z'); // 3 days ago
    expect(formatRelativeTime(date)).toBe('3d ago');
  });

  it('should return formatted date for older times', () => {
    const date = new Date('2024-01-01T12:00:00Z'); // 14 days ago
    expect(formatRelativeTime(date)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should return "Never" for invalid dates', () => {
    expect(formatRelativeTime(undefined)).toBe('Never');
    expect(formatRelativeTime('invalid-date')).toBe('Never');
  });
});

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(2621440)).toBe('2.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('should round to 2 decimal places', () => {
    expect(formatFileSize(1234567)).toBe('1.18 MB');
  });
});

describe('generateId', () => {
  it('should generate a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('should generate unique ids', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate non-empty strings', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call with latest arguments', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('third');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('third');
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should allow calls after throttle period', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to the function', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
