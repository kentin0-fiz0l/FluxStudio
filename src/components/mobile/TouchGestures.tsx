import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface TouchGesturesProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
  className?: string;
}

export const TouchGestures: React.FC<TouchGesturesProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onDoubleTap,
  onLongPress,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  longPressDelay = 500,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const [lastTap, setLastTap] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1);

  // Transform values for visual feedback
  const rotateX = useTransform(y, [-100, 100], [-10, 10]);
  const rotateY = useTransform(x, [-100, 100], [10, -10]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touches: Touch[] = [];

    const getTouchDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      touches = Array.from(e.touches);

      // Single touch - check for long press
      if (touches.length === 1) {
        if (onLongPress) {
          const timer = setTimeout(() => {
            onLongPress();
            navigator.vibrate?.(50); // Haptic feedback
          }, longPressDelay);
          setLongPressTimer(timer);
        }

        // Double tap detection
        if (onDoubleTap) {
          const currentTime = Date.now();
          const timeDiff = currentTime - lastTap;

          if (timeDiff < 300 && timeDiff > 0) {
            onDoubleTap();
            navigator.vibrate?.(25); // Haptic feedback
          }
          setLastTap(currentTime);
        }
      }

      // Two touches - setup pinch
      else if (touches.length === 2 && onPinch) {
        const distance = getTouchDistance(touches[0], touches[1]);
        setInitialDistance(distance);
        setInitialScale(scale.get());
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      touches = Array.from(e.touches);

      // Clear long press if moving
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      // Handle pinch zoom
      if (touches.length === 2 && onPinch && initialDistance) {
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const scaleChange = currentDistance / initialDistance;
        const newScale = initialScale * scaleChange;

        if (Math.abs(scaleChange - 1) > pinchThreshold) {
          scale.set(newScale);
          onPinch(newScale);
        }
      }
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      // Reset touch tracking
      touches = [];
      setInitialDistance(null);

      // Reset transform values
      x.set(0);
      y.set(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);

      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [onDoubleTap, onLongPress, onPinch, lastTap, longPressDelay, longPressTimer, initialDistance, initialScale]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    // Check for swipe gestures based on offset and velocity
    const absOffsetX = Math.abs(offset.x);
    const absOffsetY = Math.abs(offset.y);
    const absVelocityX = Math.abs(velocity.x);
    const absVelocityY = Math.abs(velocity.y);

    // Determine if this was a swipe vs just a drag
    const isSwipe = (absOffsetX > swipeThreshold || absOffsetY > swipeThreshold) &&
                   (absVelocityX > 500 || absVelocityY > 500);

    if (isSwipe) {
      // Horizontal swipes
      if (absOffsetX > absOffsetY) {
        if (offset.x > 0 && onSwipeRight) {
          onSwipeRight();
          navigator.vibrate?.(25); // Haptic feedback
        } else if (offset.x < 0 && onSwipeLeft) {
          onSwipeLeft();
          navigator.vibrate?.(25); // Haptic feedback
        }
      }
      // Vertical swipes
      else {
        if (offset.y > 0 && onSwipeDown) {
          onSwipeDown();
          navigator.vibrate?.(25); // Haptic feedback
        } else if (offset.y < 0 && onSwipeUp) {
          onSwipeUp();
          navigator.vibrate?.(25); // Haptic feedback
        }
      }
    }

    // Reset position
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      className={className}
      style={{
        x,
        y,
        scale,
        rotateX,
        rotateY,
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// Hook for detecting device capabilities
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    hasTouch: false,
    hasVibration: false,
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    screenSize: 'desktop' as 'mobile' | 'tablet' | 'desktop'
  });

  useEffect(() => {
    const updateCapabilities = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasVibration = 'vibrate' in navigator;
      const userAgent = navigator.userAgent || navigator.vendor;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /android/i.test(userAgent);
      const isMobile = hasTouch && (isIOS || isAndroid);

      let screenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (window.innerWidth < 768) {
        screenSize = 'mobile';
      } else if (window.innerWidth < 1024) {
        screenSize = 'tablet';
      }

      setCapabilities({
        hasTouch,
        hasVibration,
        isIOS,
        isAndroid,
        isMobile,
        screenSize
      });
    };

    updateCapabilities();
    window.addEventListener('resize', updateCapabilities);

    return () => window.removeEventListener('resize', updateCapabilities);
  }, []);

  return capabilities;
};

// Hook for managing touch interactions
export const useTouchInteractions = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [pressPosition, setPressPosition] = useState({ x: 0, y: 0 });
  const [pressStartTime, setPressStartTime] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPressed(true);
      setPressPosition({ x: touch.clientX, y: touch.clientY });
      setPressStartTime(Date.now());
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    setPressPosition({ x: 0, y: 0 });
    setPressStartTime(0);
  };

  const getPressData = () => ({
    isPressed,
    position: pressPosition,
    duration: isPressed ? Date.now() - pressStartTime : 0
  });

  return {
    handleTouchStart,
    handleTouchEnd,
    getPressData,
    isPressed
  };
};

// Component for pull-to-refresh functionality
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const y = useMotionValue(0);

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 0 && window.scrollY === 0) {
      setPullDistance(info.offset.y);
      y.set(Math.min(info.offset.y * 0.5, threshold));
    }
  };

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    y.set(0);
  };

  const refreshProgress = Math.min(pullDistance / threshold, 1);

  return (
    <motion.div
      className={className}
      style={{ y }}
      drag="y"
      dragDirectionLock
      dragConstraints={{ top: 0, bottom: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 10 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 text-gray-600"
          style={{ transform: `translateY(-${threshold}px)` }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full"
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
              style={{
                opacity: refreshProgress,
                scale: refreshProgress
              }}
            />
            <span className="text-sm">
              {isRefreshing ? 'Refreshing...' :
               pullDistance > threshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </motion.div>
      )}

      {children}
    </motion.div>
  );
};