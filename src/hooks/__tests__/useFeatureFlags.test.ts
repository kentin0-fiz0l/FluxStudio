/**
 * Unit Tests for useFeatureFlags Hook
 * @file src/hooks/__tests__/useFeatureFlags.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureFlags, useFeatureFlag, useExperimentVariant } from '../useFeatureFlags';

// Mock the observability service
const mockFlags = {
  isEnabled: vi.fn(),
  getVariant: vi.fn(),
  setFlag: vi.fn(),
  setVariant: vi.fn(),
  override: vi.fn(),
  clearOverrides: vi.fn(),
  getAllFlags: vi.fn(),
};

vi.mock('@/services/observability', () => ({
  observability: {
    flags: mockFlags,
  },
}));

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlags.isEnabled.mockReturnValue(false);
    mockFlags.getVariant.mockReturnValue('control');
    mockFlags.getAllFlags.mockReturnValue({});
  });

  describe('isEnabled', () => {
    it('should check if a flag is enabled', () => {
      mockFlags.isEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlags());
      const isEnabled = result.current.isEnabled('test_flag');

      expect(mockFlags.isEnabled).toHaveBeenCalledWith('test_flag', false);
      expect(isEnabled).toBe(true);
    });

    it('should use default value when provided', () => {
      mockFlags.isEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useFeatureFlags());
      result.current.isEnabled('test_flag', true);

      expect(mockFlags.isEnabled).toHaveBeenCalledWith('test_flag', true);
    });

    it('should return false when flag is not enabled', () => {
      mockFlags.isEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlags());
      const isEnabled = result.current.isEnabled('disabled_flag');

      expect(isEnabled).toBe(false);
    });
  });

  describe('getVariant', () => {
    it('should get experiment variant', () => {
      mockFlags.getVariant.mockReturnValue('treatment_a');

      const { result } = renderHook(() => useFeatureFlags());
      const variant = result.current.getVariant('ab_test');

      expect(mockFlags.getVariant).toHaveBeenCalledWith('ab_test', 'control');
      expect(variant).toBe('treatment_a');
    });

    it('should use default variant when provided', () => {
      mockFlags.getVariant.mockReturnValue('variant_b');

      const { result } = renderHook(() => useFeatureFlags());
      result.current.getVariant('ab_test', 'variant_b');

      expect(mockFlags.getVariant).toHaveBeenCalledWith('ab_test', 'variant_b');
    });
  });

  describe('setFlag', () => {
    it('should set a flag and trigger re-render', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setFlag('new_flag', true);
      });

      expect(mockFlags.setFlag).toHaveBeenCalledWith('new_flag', true);
    });

    it('should disable a flag', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setFlag('existing_flag', false);
      });

      expect(mockFlags.setFlag).toHaveBeenCalledWith('existing_flag', false);
    });
  });

  describe('setVariant', () => {
    it('should set experiment variant', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.setVariant('experiment', 'treatment_b');
      });

      expect(mockFlags.setVariant).toHaveBeenCalledWith('experiment', 'treatment_b');
    });
  });

  describe('override', () => {
    it('should override a flag temporarily', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.override('test_flag', true);
      });

      expect(mockFlags.override).toHaveBeenCalledWith('test_flag', true);
    });
  });

  describe('clearOverrides', () => {
    it('should clear all overrides', () => {
      const { result } = renderHook(() => useFeatureFlags());

      act(() => {
        result.current.clearOverrides();
      });

      expect(mockFlags.clearOverrides).toHaveBeenCalled();
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', () => {
      const allFlags = {
        flag_a: true,
        flag_b: false,
        flag_c: true,
      };
      mockFlags.getAllFlags.mockReturnValue(allFlags);

      const { result } = renderHook(() => useFeatureFlags());
      const flags = result.current.getAllFlags();

      expect(flags).toEqual(allFlags);
    });
  });
});

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return flag status', () => {
    mockFlags.isEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlag('single_flag'));

    expect(result.current).toBe(true);
  });

  it('should use default value', () => {
    mockFlags.isEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useFeatureFlag('missing_flag', true));

    expect(mockFlags.isEnabled).toHaveBeenCalledWith('missing_flag', true);
  });
});

describe('useExperimentVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return experiment variant', () => {
    mockFlags.getVariant.mockReturnValue('treatment');

    const { result } = renderHook(() => useExperimentVariant('test_experiment'));

    expect(result.current).toBe('treatment');
  });

  it('should use default variant', () => {
    mockFlags.getVariant.mockReturnValue('baseline');

    const { result } = renderHook(() => useExperimentVariant('test_experiment', 'baseline'));

    expect(mockFlags.getVariant).toHaveBeenCalledWith('test_experiment', 'baseline');
  });
});
