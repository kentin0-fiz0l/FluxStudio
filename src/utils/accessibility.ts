/**
 * Accessibility Utilities for FluxStudio
 * @file src/utils/accessibility.ts
 *
 * WCAG 2.1 AA compliance helpers and utilities
 */

/**
 * Announce content to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(liveRegion);

  // Small delay to ensure the element is in the DOM before updating
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);

  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/**
 * Focus trap for modal dialogs
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  let previouslyFocused: HTMLElement | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  return {
    activate() {
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener('keydown', handleKeyDown);
      firstFocusable?.focus();
    },
    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    },
  };
}

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateUniqueId(prefix = 'flux'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

/**
 * Check if element is visible and focusable
 */
export function isElementFocusable(element: HTMLElement): boolean {
  if (element.getAttribute('tabindex') === '-1') return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  return Array.from(elements).filter(isElementFocusable);
}

/**
 * ARIA attribute helpers
 */
export const ariaHelpers = {
  /**
   * Set up ARIA labeling relationship
   */
  labeledBy(elementId: string, labelIds: string[]): Record<string, string> {
    return {
      id: elementId,
      'aria-labelledby': labelIds.join(' '),
    };
  },

  /**
   * Set up ARIA description relationship
   */
  describedBy(elementId: string, descriptionIds: string[]): Record<string, string> {
    return {
      id: elementId,
      'aria-describedby': descriptionIds.join(' '),
    };
  },

  /**
   * Create ARIA-live region props
   */
  liveRegion(priority: 'polite' | 'assertive' = 'polite'): Record<string, string> {
    return {
      role: 'status',
      'aria-live': priority,
      'aria-atomic': 'true',
    };
  },

  /**
   * Create props for expandable content
   */
  expandable(isExpanded: boolean, controlsId: string): Record<string, string | boolean> {
    return {
      'aria-expanded': isExpanded,
      'aria-controls': controlsId,
    };
  },

  /**
   * Create props for selected item in list
   */
  selectable(isSelected: boolean): Record<string, boolean> {
    return {
      'aria-selected': isSelected,
    };
  },

  /**
   * Create props for loading state
   */
  loading(isLoading: boolean): Record<string, string | boolean> {
    return isLoading
      ? { 'aria-busy': true, 'aria-label': 'Loading...' }
      : { 'aria-busy': false };
  },
};

/**
 * Keyboard navigation helpers
 */
export const keyboardHelpers = {
  /**
   * Handle arrow key navigation in a list
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: { wrap?: boolean; orientation?: 'horizontal' | 'vertical' } = {}
  ): number | null {
    const { wrap = true, orientation = 'vertical' } = options;

    const isNext =
      (orientation === 'vertical' && event.key === 'ArrowDown') ||
      (orientation === 'horizontal' && event.key === 'ArrowRight');

    const isPrev =
      (orientation === 'vertical' && event.key === 'ArrowUp') ||
      (orientation === 'horizontal' && event.key === 'ArrowLeft');

    if (!isNext && !isPrev) return null;

    event.preventDefault();

    let nextIndex: number;

    if (isNext) {
      nextIndex = currentIndex + 1;
      if (nextIndex >= items.length) {
        nextIndex = wrap ? 0 : items.length - 1;
      }
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = wrap ? items.length - 1 : 0;
      }
    }

    items[nextIndex]?.focus();
    return nextIndex;
  },

  /**
   * Handle Home/End key navigation
   */
  handleHomeEndNavigation(
    event: KeyboardEvent,
    items: HTMLElement[]
  ): number | null {
    if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
      return 0;
    }

    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
      return items.length - 1;
    }

    return null;
  },
};

/**
 * Color contrast checker (WCAG 2.1)
 */
export function checkColorContrast(foreground: string, background: string): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
} {
  const getLuminance = (color: string): number => {
    const rgb = parseColor(color);
    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const parseColor = (color: string): [number, number, number] => {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
        ];
      }
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }

    // Handle rgb(a) colors
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    return [0, 0, 0];
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,      // Normal text
    passesAAA: ratio >= 7,       // Enhanced
    passesAALarge: ratio >= 3,   // Large text (18pt+)
    passesAAALarge: ratio >= 4.5, // Large text enhanced
  };
}

/**
 * Skip link component props
 */
export function getSkipLinkProps(targetId: string): Record<string, string> {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg',
  };
}

/**
 * Reduced motion preference detection
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

export default {
  announceToScreenReader,
  createFocusTrap,
  generateUniqueId,
  isElementFocusable,
  getFocusableElements,
  ariaHelpers,
  keyboardHelpers,
  checkColorContrast,
  getSkipLinkProps,
  prefersReducedMotion,
  prefersHighContrast,
};
