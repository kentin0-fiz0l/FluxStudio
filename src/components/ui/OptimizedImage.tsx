/**
 * Optimized Image Component
 * Lazy loading, responsive images, blur placeholder, and caching
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  optimizeImageUrl,
  generateBlurPlaceholder,
  generateSrcSet,
  calculateResponsiveSizes,
  lazyLoadImage,
} from '../../utils/imageOptimization';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'onLoad' | 'onDrag'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  blurPlaceholder?: boolean;
  /** Custom LQIP data URL or tiny thumbnail URL */
  lqip?: string;
  lazy?: boolean;
  priority?: boolean;
  responsive?: boolean;
  className?: string;
  onImageLoad?: () => void;
  onImageError?: (error: Error) => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  blurPlaceholder = true,
  lqip,
  lazy = true,
  priority = false,
  responsive = true,
  className,
  onImageLoad,
  onImageError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Compute initial image source - priority images get optimized URL immediately
  const initialImageSrc = useMemo(() => {
    if (priority || !lazy) {
      return optimizeImageUrl(src, {
        quality,
        maxWidth: width,
        maxHeight: height,
      });
    }
    return blurPlaceholder ? generateBlurPlaceholder(src) : '';
  }, [src, priority, lazy, quality, width, height, blurPlaceholder]);

  const [imageSrc, setImageSrc] = useState<string>(initialImageSrc);

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<(() => void) | null>(null);

  // Update imageSrc when initialImageSrc changes (e.g., when props change)
  useEffect(() => {
    setImageSrc(initialImageSrc);
  }, [initialImageSrc]);

  useEffect(() => {
    if (!imgRef.current) return;

    // Priority images are already handled via useMemo
    if (priority || !lazy) {
      return;
    }

    // Lazy load with intersection observer
    observerRef.current = lazyLoadImage(
      imgRef.current,
      src,
      { quality, maxWidth: width, maxHeight: height }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current();
      }
    };
  }, [src, lazy, priority, quality, width, height]);

  const handleLoad = () => {
    setIsLoading(false);
    onImageLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onImageError?.(new Error('Failed to load image'));
  };

  // Generate responsive attributes
  const responsiveAttrs = responsive && width
    ? {
        srcSet: generateSrcSet(src),
        sizes: calculateResponsiveSizes(width),
      }
    : {};

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-muted rounded-lg',
          className
        )}
        style={{ width, height }}
      >
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">Failed to load image</p>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      <AnimatePresence mode="wait">
        {isLoading && blurPlaceholder && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-muted"
          >
            {lqip || (initialImageSrc && initialImageSrc !== imageSrc) ? (
              <img
                src={lqip || initialImageSrc}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover blur-lg scale-110"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <ImageIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.img
        ref={imgRef}
        src={imageSrc || undefined}
        alt={alt}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'object-cover w-full h-full',
          isLoading && 'blur-sm'
        )}
        {...responsiveAttrs}
      />
    </div>
  );
}

export default OptimizedImage;
