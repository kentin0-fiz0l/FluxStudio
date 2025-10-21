/**
 * Optimized Image Component
 * Lazy loading, responsive images, blur placeholder, and caching
 */

import React, { useState, useEffect, useRef } from 'react';
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

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  blurPlaceholder?: boolean;
  lazy?: boolean;
  priority?: boolean;
  responsive?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  blurPlaceholder = true,
  lazy = true,
  priority = false,
  responsive = true,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(
    blurPlaceholder ? generateBlurPlaceholder(src) : ''
  );

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    // Priority images load immediately
    if (priority || !lazy) {
      const optimizedSrc = optimizeImageUrl(src, {
        quality,
        maxWidth: width,
        maxHeight: height,
      });
      setImageSrc(optimizedSrc);
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
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.(new Error('Failed to load image'));
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
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
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
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-muted"
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
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
        {...props}
      />
    </div>
  );
}

export default OptimizedImage;
