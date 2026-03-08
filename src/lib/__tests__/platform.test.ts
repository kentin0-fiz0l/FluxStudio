/**
 * Unit Tests for platform detection utility
 * @file src/lib/__tests__/platform.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectPlatform, getDesktopDownloadUrl, isDesktopAvailable } from '../platform';

describe('platform', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectPlatform', () => {
    it('should detect macOS from user agent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      );
      expect(detectPlatform()).toBe('macos');
    });

    it('should detect Windows from user agent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      );
      expect(detectPlatform()).toBe('windows');
    });

    it('should detect Linux from user agent', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      );
      expect(detectPlatform()).toBe('linux');
    });

    it('should return unknown for unrecognised user agents', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('SomeCustomBrowser/1.0');
      expect(detectPlatform()).toBe('unknown');
    });
  });

  describe('getDesktopDownloadUrl', () => {
    it('should return DMG URL for macOS', () => {
      const url = getDesktopDownloadUrl('macos');
      expect(url).toContain('FluxStudio_universal.dmg');
    });

    it('should return EXE URL for Windows', () => {
      const url = getDesktopDownloadUrl('windows');
      expect(url).toContain('FluxStudio_x64-setup.exe');
    });

    it('should return AppImage URL for Linux', () => {
      const url = getDesktopDownloadUrl('linux');
      expect(url).toContain('FluxStudio_amd64.AppImage');
    });

    it('should return empty string for unknown platform', () => {
      expect(getDesktopDownloadUrl('unknown')).toBe('');
    });
  });

  describe('isDesktopAvailable', () => {
    it('should return true on macOS', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      );
      expect(isDesktopAvailable()).toBe(true);
    });

    it('should return true on Windows', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      );
      expect(isDesktopAvailable()).toBe(true);
    });

    it('should return false on Linux', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (X11; Linux x86_64)',
      );
      expect(isDesktopAvailable()).toBe(false);
    });
  });
});
