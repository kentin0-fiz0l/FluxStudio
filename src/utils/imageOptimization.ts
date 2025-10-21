/**
 * Image Optimization Utilities
 * Advanced image loading, caching, and optimization strategies
 */

interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  blur?: boolean;
  lazy?: boolean;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Generates optimized image URL with parameters
 */
export function optimizeImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    quality = 80,
    maxWidth,
    maxHeight,
    format = 'auto',
  } = options;

  // If using a CDN that supports image optimization (Cloudinary, imgix, etc.)
  // modify this function to use their URL parameters

  const params = new URLSearchParams();

  if (quality !== 80) params.set('q', quality.toString());
  if (maxWidth) params.set('w', maxWidth.toString());
  if (maxHeight) params.set('h', maxHeight.toString());
  if (format !== 'auto') params.set('f', format);

  const separator = url.includes('?') ? '&' : '?';
  return params.toString() ? `${url}${separator}${params.toString()}` : url;
}

/**
 * Lazy load image with intersection observer
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  options: ImageOptimizationOptions = {}
): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement;
          image.src = optimizeImageUrl(src, options);
          observer.unobserve(image);
        }
      });
    },
    {
      rootMargin: '50px', // Start loading 50px before entering viewport
      threshold: 0.01,
    }
  );

  observer.observe(img);

  // Return cleanup function
  return () => observer.unobserve(img);
}

/**
 * Preload critical images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
    })
  );
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Generate blur placeholder (low quality image placeholder)
 */
export function generateBlurPlaceholder(url: string): string {
  return optimizeImageUrl(url, {
    quality: 10,
    maxWidth: 40,
    blur: true,
  });
}

/**
 * Calculate responsive image sizes
 */
export function calculateResponsiveSizes(
  baseWidth: number,
  breakpoints: number[] = [640, 768, 1024, 1280, 1536]
): string {
  const sizes = breakpoints
    .map((bp, index) => {
      const nextBp = breakpoints[index + 1];
      if (nextBp) {
        return `(max-width: ${bp}px) ${Math.min(baseWidth, bp)}px`;
      }
      return `${baseWidth}px`;
    })
    .join(', ');

  return sizes;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  url: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): string {
  return widths
    .map(width => {
      const optimizedUrl = optimizeImageUrl(url, { maxWidth: width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Image cache manager
 */
class ImageCache {
  private cache = new Map<string, string>();
  private maxSize = 50; // Maximum number of cached images

  set(url: string, data: string): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(url, data);
  }

  get(url: string): string | undefined {
    return this.cache.get(url);
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const imageCache = new ImageCache();

/**
 * Load image with caching
 */
export async function loadImageWithCache(url: string): Promise<string> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, url);
      resolve(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Compress image file before upload
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
  } = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        format,
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if WebP is supported
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'jpeg' {
  return supportsWebP() ? 'webp' : 'jpeg';
}

export default {
  optimizeImageUrl,
  lazyLoadImage,
  preloadImages,
  getImageDimensions,
  generateBlurPlaceholder,
  calculateResponsiveSizes,
  generateSrcSet,
  loadImageWithCache,
  compressImage,
  supportsWebP,
  getOptimalFormat,
  imageCache,
};
