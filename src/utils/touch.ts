/**
 * Touch Gesture Utilities
 * @file src/utils/touch.ts
 *
 * Enhanced touch handling for mobile interactions
 */

export interface Point {
  x: number;
  y: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

export interface PinchGesture {
  scale: number;
  center: Point;
}

export interface TouchState {
  isActive: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  startTime: number;
  touchCount: number;
}

/**
 * Calculate distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points (in degrees)
 */
export function getAngle(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Get midpoint between two points
 */
export function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Get touch point from TouchEvent
 */
export function getTouchPoint(touch: Touch): Point {
  return {
    x: touch.clientX,
    y: touch.clientY,
  };
}

/**
 * Get all touch points from TouchEvent
 */
export function getTouchPoints(event: TouchEvent): Point[] {
  return Array.from(event.touches).map(getTouchPoint);
}

/**
 * Detect swipe direction from two points
 */
export function detectSwipeDirection(
  start: Point,
  end: Point,
  threshold: number = 30
): 'left' | 'right' | 'up' | 'down' | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Check if movement exceeds threshold
  if (Math.max(absDx, absDy) < threshold) {
    return null;
  }

  // Determine primary direction
  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
}

/**
 * Calculate swipe velocity
 */
export function calculateVelocity(
  start: Point,
  end: Point,
  duration: number
): number {
  if (duration === 0) return 0;
  const distance = getDistance(start, end);
  return distance / duration;
}

/**
 * Create a swipe gesture handler
 */
export function createSwipeHandler(options: {
  onSwipe: (gesture: SwipeGesture) => void;
  threshold?: number;
  velocityThreshold?: number;
}): {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
} {
  const { threshold = 50, velocityThreshold = 0.3 } = options;

  let startPoint: Point | null = null;
  let startTime = 0;

  return {
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startPoint = getTouchPoint(e.touches[0]);
        startTime = Date.now();
      }
    },

    onTouchMove: () => {
      // Optional: could track movement here
    },

    onTouchEnd: (e: TouchEvent) => {
      if (!startPoint || e.changedTouches.length === 0) return;

      const endPoint = getTouchPoint(e.changedTouches[0]);
      const duration = Date.now() - startTime;
      const distance = getDistance(startPoint, endPoint);
      const velocity = calculateVelocity(startPoint, endPoint, duration);
      const direction = detectSwipeDirection(startPoint, endPoint, threshold);

      if (direction && (distance >= threshold || velocity >= velocityThreshold)) {
        options.onSwipe({
          direction,
          distance,
          velocity,
          duration,
        });
      }

      startPoint = null;
    },
  };
}

/**
 * Create a pinch-to-zoom handler
 */
export function createPinchHandler(options: {
  onPinchStart?: (gesture: PinchGesture) => void;
  onPinchMove?: (gesture: PinchGesture) => void;
  onPinchEnd?: (gesture: PinchGesture) => void;
}): {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
} {
  let initialDistance = 0;
  let initialCenter: Point | null = null;

  return {
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const p1 = getTouchPoint(e.touches[0]);
        const p2 = getTouchPoint(e.touches[1]);
        initialDistance = getDistance(p1, p2);
        initialCenter = getMidpoint(p1, p2);

        options.onPinchStart?.({
          scale: 1,
          center: initialCenter,
        });
      }
    },

    onTouchMove: (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        const p1 = getTouchPoint(e.touches[0]);
        const p2 = getTouchPoint(e.touches[1]);
        const currentDistance = getDistance(p1, p2);
        const currentCenter = getMidpoint(p1, p2);
        const scale = currentDistance / initialDistance;

        options.onPinchMove?.({
          scale,
          center: currentCenter,
        });
      }
    },

    onTouchEnd: () => {
      if (initialDistance > 0 && initialCenter) {
        options.onPinchEnd?.({
          scale: 1,
          center: initialCenter,
        });
      }
      initialDistance = 0;
      initialCenter = null;
    },
  };
}

/**
 * Create a long-press handler
 */
export function createLongPressHandler(options: {
  onLongPress: (point: Point) => void;
  duration?: number;
  tolerance?: number;
}): {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
} {
  const { duration = 500, tolerance = 10 } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let startPoint: Point | null = null;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    startPoint = null;
  };

  return {
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        clear();
        return;
      }

      startPoint = getTouchPoint(e.touches[0]);
      timer = setTimeout(() => {
        if (startPoint) {
          options.onLongPress(startPoint);
        }
        clear();
      }, duration);
    },

    onTouchMove: (e: TouchEvent) => {
      if (!startPoint || e.touches.length !== 1) {
        clear();
        return;
      }

      const currentPoint = getTouchPoint(e.touches[0]);
      const distance = getDistance(startPoint, currentPoint);

      if (distance > tolerance) {
        clear();
      }
    },

    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}

/**
 * Create a double-tap handler
 */
export function createDoubleTapHandler(options: {
  onDoubleTap: (point: Point) => void;
  maxDelay?: number;
  maxDistance?: number;
}): {
  onTouchEnd: (e: TouchEvent) => void;
} {
  const { maxDelay = 300, maxDistance = 40 } = options;

  let lastTap: { point: Point; time: number } | null = null;

  return {
    onTouchEnd: (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;

      const currentPoint = getTouchPoint(e.changedTouches[0]);
      const currentTime = Date.now();

      if (lastTap) {
        const timeDiff = currentTime - lastTap.time;
        const distance = getDistance(lastTap.point, currentPoint);

        if (timeDiff < maxDelay && distance < maxDistance) {
          options.onDoubleTap(currentPoint);
          lastTap = null;
          return;
        }
      }

      lastTap = { point: currentPoint, time: currentTime };
    },
  };
}

/**
 * Prevent default touch behavior for specific scenarios
 */
export function preventTouchDefault(element: HTMLElement): () => void {
  const handler = (e: TouchEvent) => {
    e.preventDefault();
  };

  element.addEventListener('touchmove', handler, { passive: false });

  return () => {
    element.removeEventListener('touchmove', handler);
  };
}

/**
 * Disable iOS Safari bounce scroll
 */
export function disableBouncyScroll(): () => void {
  const handler = (e: TouchEvent) => {
    // Disable bounce only when at scroll boundaries
    const target = e.target as HTMLElement;
    const scrollable = target.closest('[data-scrollable]');

    if (!scrollable) {
      e.preventDefault();
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollable;
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;

    if ((isAtTop && e.touches[0].clientY > 0) ||
        (isAtBottom && e.touches[0].clientY < 0)) {
      e.preventDefault();
    }
  };

  document.body.addEventListener('touchmove', handler, { passive: false });

  return () => {
    document.body.removeEventListener('touchmove', handler);
  };
}

/**
 * Create touch ripple effect
 */
export function createTouchRipple(
  element: HTMLElement,
  event: TouchEvent,
  options: {
    color?: string;
    duration?: number;
  } = {}
): void {
  const { color = 'rgba(255, 255, 255, 0.3)', duration = 600 } = options;

  const rect = element.getBoundingClientRect();
  const touch = event.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 2;

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    background: ${color};
    border-radius: 50%;
    transform: scale(0);
    animation: ripple-effect ${duration}ms ease-out forwards;
    pointer-events: none;
  `;

  // Add keyframes if not exists
  if (!document.querySelector('#ripple-keyframes')) {
    const style = document.createElement('style');
    style.id = 'ripple-keyframes';
    style.textContent = `
      @keyframes ripple-effect {
        to {
          transform: scale(1);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, duration);
}

export default {
  getDistance,
  getAngle,
  getMidpoint,
  getTouchPoint,
  getTouchPoints,
  detectSwipeDirection,
  calculateVelocity,
  createSwipeHandler,
  createPinchHandler,
  createLongPressHandler,
  createDoubleTapHandler,
  preventTouchDefault,
  disableBouncyScroll,
  createTouchRipple,
};
