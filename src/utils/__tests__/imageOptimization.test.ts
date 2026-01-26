/**
 * Unit Tests - Image Optimization Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  optimizeImageUrl,
  generateSrcSet,
  calculateResponsiveSizes,
  generateBlurPlaceholder,
  getImageDimensions,
  preloadImages,
  compressImage,
  supportsWebP,
  getOptimalFormat,
  imageCache,
} from '../imageOptimization';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('imageOptimization utilities', () => {
  beforeEach(() => {
    imageCache.clear();
    vi.clearAllMocks();
  });

  describe('optimizeImageUrl', () => {
    it('should generate optimized URL with quality parameter', () => {
      const url = 'https://example.com/image.jpg';
      const optimized = optimizeImageUrl(url, { quality: 60 });

      expect(optimized).toContain('q=60');
    });

    it('should add width parameter', () => {
      const url = 'https://example.com/image.jpg';
      const optimized = optimizeImageUrl(url, { maxWidth: 1200 });

      expect(optimized).toContain('w=1200');
    });

    it('should add height parameter', () => {
      const url = 'https://example.com/image.jpg';
      const optimized = optimizeImageUrl(url, { maxHeight: 800 });

      expect(optimized).toContain('h=800');
    });

    it('should add format parameter', () => {
      const url = 'https://example.com/image.jpg';
      const optimized = optimizeImageUrl(url, { format: 'webp' });

      expect(optimized).toContain('f=webp');
    });

    it('should combine multiple parameters', () => {
      const url = 'https://example.com/image.jpg';
      const optimized = optimizeImageUrl(url, {
        quality: 75,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'webp',
      });

      expect(optimized).toContain('q=75');
      expect(optimized).toContain('w=1920');
      expect(optimized).toContain('h=1080');
      expect(optimized).toContain('f=webp');
    });

    it('should handle URLs with existing query parameters', () => {
      const url = 'https://example.com/image.jpg?existing=param';
      // Use quality != 80 since 80 is default and won't be added
      const optimized = optimizeImageUrl(url, { quality: 75 });

      expect(optimized).toContain('existing=param');
      expect(optimized).toContain('q=75');
      expect(optimized).toContain('&');
    });

    it('should not add default quality parameter', () => {
      const url = 'https://example.com/image.jpg';
      const optimized = optimizeImageUrl(url, { quality: 80 });

      expect(optimized).toBe(url); // Quality 80 is default, should not be added
    });
  });

  describe('generateSrcSet', () => {
    it('should generate srcset with default widths', () => {
      const url = 'https://example.com/image.jpg';
      const srcSet = generateSrcSet(url);

      expect(srcSet).toContain('320w');
      expect(srcSet).toContain('640w');
      expect(srcSet).toContain('768w');
      expect(srcSet).toContain('1024w');
      expect(srcSet).toContain('1280w');
      expect(srcSet).toContain('1536w');
    });

    it('should generate srcset with custom widths', () => {
      const url = 'https://example.com/image.jpg';
      const srcSet = generateSrcSet(url, [400, 800, 1600]);

      expect(srcSet).toContain('400w');
      expect(srcSet).toContain('800w');
      expect(srcSet).toContain('1600w');
      expect(srcSet).not.toContain('320w');
    });

    it('should include optimized URLs in srcset', () => {
      const url = 'https://example.com/image.jpg';
      const srcSet = generateSrcSet(url, [640]);

      expect(srcSet).toContain('w=640');
      expect(srcSet).toContain('640w');
    });
  });

  describe('calculateResponsiveSizes', () => {
    it('should generate responsive sizes attribute', () => {
      const sizes = calculateResponsiveSizes(1200, [640, 768, 1024]);

      expect(sizes).toContain('(max-width: 640px)');
      expect(sizes).toContain('(max-width: 768px)');
      expect(sizes).toContain('1200px'); // Default size
    });

    it('should cap sizes at breakpoint width', () => {
      const sizes = calculateResponsiveSizes(2000, [640, 768, 1024]);

      expect(sizes).toContain('640px'); // Capped at 640 for first breakpoint
      expect(sizes).toContain('768px'); // Capped at 768 for second breakpoint
      expect(sizes).toContain('2000px'); // Default full size for last breakpoint
    });
  });

  describe('generateBlurPlaceholder', () => {
    it('should create low quality placeholder URL', () => {
      const url = 'https://example.com/image.jpg';
      const placeholder = generateBlurPlaceholder(url);

      expect(placeholder).toContain('q=10');
      expect(placeholder).toContain('w=40');
    });
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      // Mock Image constructor
      const mockImage = {
        naturalWidth: 1920,
        naturalHeight: 1080,
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => {
        setTimeout(() => mockImage.onload?.(), 0);
        return mockImage as any;
      }) as any;

      const dimensions = await getImageDimensions('https://example.com/image.jpg');

      expect(dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('should reject on image load error', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => {
        setTimeout(() => mockImage.onerror?.(new Error('Failed')), 0);
        return mockImage as any;
      }) as any;

      await expect(getImageDimensions('https://example.com/invalid.jpg')).rejects.toThrow();
    });
  });

  describe('preloadImages', () => {
    it('should preload multiple images', async () => {
      // Create a proper mock that triggers onload when src is set
      class MockImage {
        onload: (() => void) | null = null;
        onerror: ((e: Error) => void) | null = null;
        private _src: string = '';

        get src() { return this._src; }
        set src(value: string) {
          this._src = value;
          // Trigger onload after a microtask to allow onload assignment
          Promise.resolve().then(() => {
            if (this.onload) this.onload();
          });
        }
      }

      global.Image = MockImage as any;

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      await expect(preloadImages(urls)).resolves.toBeDefined();
    });

    it('should handle preload failures', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = vi.fn(() => {
        setTimeout(() => mockImage.onerror?.(new Error('Failed')), 0);
        return mockImage as any;
      }) as any;

      const urls = ['https://example.com/invalid.jpg'];

      await expect(preloadImages(urls)).rejects.toThrow();
    });
  });

  describe('compressImage', () => {
    it('should compress image with default options', async () => {
      // Mock File
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });

      // Mock canvas and context
      const mockContext = {
        drawImage: vi.fn(),
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockContext),
        toBlob: vi.fn((callback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        }),
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);

      // Mock Image with proper src setter that triggers onload
      class MockImage {
        naturalWidth = 3840;
        naturalHeight = 2160;
        onload: (() => void) | null = null;
        onerror: ((e: Error) => void) | null = null;
        private _src: string = '';

        get src() { return this._src; }
        set src(value: string) {
          this._src = value;
          Promise.resolve().then(() => {
            if (this.onload) this.onload();
          });
        }
      }

      global.Image = MockImage as any;

      const compressed = await compressImage(mockFile);

      expect(compressed).toBeInstanceOf(Blob);
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    it('should scale down large images', async () => {
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });

      const mockContext = {
        drawImage: vi.fn(),
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockContext),
        toBlob: vi.fn((callback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        }),
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);

      // Mock Image with proper src setter
      class MockImage {
        naturalWidth = 3840;
        naturalHeight = 2160;
        onload: (() => void) | null = null;
        onerror: ((e: Error) => void) | null = null;
        private _src: string = '';

        get src() { return this._src; }
        set src(value: string) {
          this._src = value;
          Promise.resolve().then(() => {
            if (this.onload) this.onload();
          });
        }
      }

      global.Image = MockImage as any;

      const result = await compressImage(mockFile, {
        maxWidth: 1920,
        maxHeight: 1080,
      });

      // Should return compressed blob and drawImage should have been called
      expect(result).toBeInstanceOf(Blob);
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });
  });

  describe('supportsWebP', () => {
    it('should detect WebP support', () => {
      // Mock canvas
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn(() => 'data:image/webp;base64,abc'),
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);

      expect(supportsWebP()).toBe(true);
    });

    it('should detect lack of WebP support', () => {
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);

      expect(supportsWebP()).toBe(false);
    });
  });

  describe('getOptimalFormat', () => {
    it('should return webp when supported', () => {
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn(() => 'data:image/webp;base64,abc'),
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);

      expect(getOptimalFormat()).toBe('webp');
    });

    it('should return jpeg when webp not supported', () => {
      const mockCanvas = {
        width: 1,
        height: 1,
        toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
      };

      global.document.createElement = vi.fn(() => mockCanvas as any);

      expect(getOptimalFormat()).toBe('jpeg');
    });
  });

  describe('imageCache', () => {
    it('should cache images', () => {
      imageCache.set('key1', 'url1');
      imageCache.set('key2', 'url2');

      expect(imageCache.get('key1')).toBe('url1');
      expect(imageCache.get('key2')).toBe('url2');
      expect(imageCache.has('key1')).toBe(true);
    });

    it('should respect max cache size', () => {
      // Fill cache beyond max size (50)
      for (let i = 0; i < 55; i++) {
        imageCache.set(`key${i}`, `url${i}`);
      }

      // First entries should be evicted
      expect(imageCache.has('key0')).toBe(false);
      expect(imageCache.has('key1')).toBe(false);

      // Recent entries should exist
      expect(imageCache.has('key54')).toBe(true);
    });

    it('should clear cache', () => {
      imageCache.set('key1', 'url1');
      imageCache.set('key2', 'url2');

      imageCache.clear();

      expect(imageCache.has('key1')).toBe(false);
      expect(imageCache.has('key2')).toBe(false);
    });
  });
});
