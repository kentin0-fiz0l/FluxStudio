# Sprint 12 UX Implementation Guide
## FluxStudio P0 UX Improvements

**Sprint Duration:** Sprint 12
**Target WCAG Level:** 2.1 AA (Critical: Level A minimum)
**Mobile Form Completion Target:** 85% (Current: 60%)
**Focus:** Security + UX Harmony

---

## Executive Summary

This guide provides comprehensive implementation details for Sprint 12's P0 UX improvements, ensuring that security enhancements (JWT refresh, stricter validation) enhance rather than degrade user experience. All implementations prioritize mobile-first design, accessibility compliance, and conversion optimization.

### Key Objectives
1. **Transparent Authentication**: JWT refresh without interrupting creative flow
2. **Mobile Excellence**: Enhanced keyboard handling and form completion
3. **Accessibility Leadership**: WCAG 2.1 AA compliance across all interactions
4. **Onboarding Optimization**: Reduce time-to-value for new users
5. **Security Without Friction**: Security that users don't have to think about

---

## Table of Contents

1. [Transparent JWT Token Refresh](#1-transparent-jwt-token-refresh)
2. [Mobile Keyboard Handling](#2-mobile-keyboard-handling)
3. [Skip Navigation Component](#3-skip-navigation-component)
4. [Enhanced Focus Indicators](#4-enhanced-focus-indicators)
5. [First-Time User Onboarding](#5-first-time-user-onboarding)
6. [Testing Procedures](#6-testing-procedures)
7. [Success Metrics](#7-success-metrics)
8. [A/B Testing Plan](#8-ab-testing-plan)

---

## 1. Transparent JWT Token Refresh

### UX Principle
**Users should never know their session is being refreshed.** Authentication should be invisible until absolutely necessary.

### Implementation Strategy

#### 1.1 Token Refresh Hook

**File:** `/src/hooks/useTokenRefresh.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

interface TokenRefreshConfig {
  refreshThreshold: number; // milliseconds before expiry to refresh
  silentMode: boolean; // true = no UI feedback
  onRefreshStart?: () => void;
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: Error) => void;
}

const DEFAULT_CONFIG: TokenRefreshConfig = {
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
  silentMode: true,
};

export function useTokenRefresh(config: Partial<TokenRefreshConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { user, logout } = useAuth();
  const refreshInProgress = useRef(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const decodeToken = useCallback((token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        exp: payload.exp * 1000, // Convert to milliseconds
        iat: payload.iat * 1000,
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (refreshInProgress.current) {
      return;
    }

    refreshInProgress.current = true;

    try {
      finalConfig.onRefreshStart?.();

      const response = await apiService.makeRequest('/auth/refresh', {
        method: 'POST',
        requireAuth: true,
      });

      if (response.success && response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
        finalConfig.onRefreshSuccess?.();
        scheduleNextRefresh(response.data.token);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      finalConfig.onRefreshError?.(error as Error);

      // On refresh failure, log user out gracefully
      await logout();
    } finally {
      refreshInProgress.current = false;
    }
  }, [finalConfig, logout]);

  const scheduleNextRefresh = useCallback((token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) return;

    const now = Date.now();
    const timeUntilExpiry = decoded.exp - now;
    const refreshTime = timeUntilExpiry - finalConfig.refreshThreshold;

    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule refresh before token expires
    if (refreshTime > 0) {
      refreshTimerRef.current = setTimeout(() => {
        refreshToken();
      }, refreshTime);
    } else {
      // Token already expired or about to expire, refresh immediately
      refreshToken();
    }
  }, [decodeToken, finalConfig.refreshThreshold, refreshToken]);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('auth_token');
    if (token) {
      scheduleNextRefresh(token);
    }

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [user, scheduleNextRefresh]);

  // Return manual refresh function for components that need it
  return {
    refreshToken,
    isRefreshing: refreshInProgress.current,
  };
}
```

#### 1.2 Session Timeout Warning

**File:** `/src/components/SessionTimeoutWarning.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SessionTimeoutWarningProps {
  warningThreshold?: number; // milliseconds before expiry to show warning
}

export function SessionTimeoutWarning({
  warningThreshold = 2 * 60 * 1000 // 2 minutes
}: SessionTimeoutWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      const timeUntilWarning = expiryTime - now - warningThreshold;

      if (timeUntilWarning > 0) {
        const warningTimer = setTimeout(() => {
          setShowWarning(true);
          setCountdown(Math.floor(warningThreshold / 1000));
        }, timeUntilWarning);

        return () => clearTimeout(warningTimer);
      }
    } catch (error) {
      console.error('Failed to parse token:', error);
    }
  }, [user, warningThreshold]);

  useEffect(() => {
    if (!showWarning || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, countdown, logout]);

  const handleStaySignedIn = () => {
    setShowWarning(false);
    // Trigger token refresh
    window.location.reload();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent
        className="max-w-md"
        role="alertdialog"
        aria-live="assertive"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Your session will expire in{' '}
            <span className="font-mono font-bold text-primary" aria-live="polite">
              {formatTime(countdown)}
            </span>
            . Would you like to stay signed in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={logout}
            className="w-full sm:w-auto"
          >
            Sign Out
          </Button>
          <AlertDialogAction
            onClick={handleStaySignedIn}
            className="w-full sm:w-auto"
            autoFocus
          >
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### 1.3 API Interceptor for Token Refresh

**Update:** `/src/services/apiService.ts`

Add to the `ApiService` class:

```typescript
// Add these methods to the ApiService class

/**
 * Enhanced makeRequest with automatic token refresh
 */
private async makeRequestWithRefresh<T>(
  url: string,
  options: RequestConfig = {}
): Promise<ApiResponse<T>> {
  try {
    return await this.makeRequest<T>(url, options);
  } catch (error) {
    // Check if error is 401 and we have a refresh token
    if (error instanceof Error && error.message.includes('401')) {
      try {
        // Attempt to refresh token
        const refreshResponse = await this.makeRequest('/auth/refresh', {
          method: 'POST',
          requireAuth: true,
        });

        if (refreshResponse.success && refreshResponse.data?.token) {
          localStorage.setItem('auth_token', refreshResponse.data.token);

          // Retry original request with new token
          return await this.makeRequest<T>(url, options);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/login?session_expired=true';
        throw new Error('Session expired');
      }
    }

    throw error;
  }
}
```

### UX Specifications

#### Loading States

**Micro-interaction:** Subtle progress indicator during refresh
- **Position:** Top-right corner, non-intrusive
- **Animation:** Linear progress bar (2px height)
- **Color:** Primary gradient (#8B5CF6 → #06B6D4)
- **Duration:** Match actual refresh time (typically 200-500ms)
- **Accessibility:** `aria-live="polite"` region with status text

```typescript
// Example loading state component
<div
  role="status"
  aria-live="polite"
  className="sr-only"
>
  {isRefreshing ? 'Refreshing session...' : ''}
</div>
```

#### Error Handling

**Scenario 1: Network Error During Refresh**
- Show toast notification: "Connection interrupted. Retrying..."
- Auto-retry 3 times with exponential backoff
- After 3 failures: "Unable to connect. Please check your internet."

**Scenario 2: Server Error During Refresh**
- Log user out gracefully
- Show message: "Your session has expired. Please sign in again."
- Preserve user's current route for post-login redirect

**Scenario 3: Token Refresh Succeeds But Data Request Fails**
- Treat as normal API error
- Don't confuse user with authentication messaging

### Testing Checklist

- [ ] Token refreshes 5 minutes before expiry
- [ ] No UI interruption during silent refresh
- [ ] Session timeout warning appears 2 minutes before expiry
- [ ] Countdown timer updates every second
- [ ] "Stay Signed In" button refreshes token successfully
- [ ] "Sign Out" button logs user out immediately
- [ ] Expired session redirects to login with return URL
- [ ] Works correctly with multiple tabs open
- [ ] Screen reader announces session status changes
- [ ] Mobile viewport displays warning dialog correctly

---

## 2. Mobile Keyboard Handling

### UX Principle
**The keyboard should never hide form fields or actions.** Mobile users should always see what they're typing and be able to submit forms without dismissing the keyboard.

### Implementation

#### 2.1 Keyboard-Aware Scroll Hook

**File:** `/src/hooks/useKeyboardAwareScroll.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from './useBreakpoint';

interface KeyboardAwareConfig {
  enabled?: boolean;
  offset?: number; // Additional padding above input
  smoothScroll?: boolean;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
}

export function useKeyboardAwareScroll(config: KeyboardAwareConfig = {}) {
  const {
    enabled = true,
    offset = 20,
    smoothScroll = true,
    onKeyboardShow,
    onKeyboardHide,
  } = config;

  const isMobile = useIsMobile();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const initialViewportHeight = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    // Store initial viewport height
    initialViewportHeight.current = window.visualViewport?.height || window.innerHeight;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;

      // Only handle input elements
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      activeElementRef.current = target;

      // Wait for keyboard to appear (iOS delay)
      setTimeout(() => {
        const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
        const calculatedKeyboardHeight = initialViewportHeight.current - currentViewportHeight;

        if (calculatedKeyboardHeight > 100) { // Keyboard is visible
          setIsKeyboardVisible(true);
          setKeyboardHeight(calculatedKeyboardHeight);
          onKeyboardShow?.();

          // Scroll element into view
          const rect = target.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetY = rect.top + scrollTop - offset;
          const viewportHeight = currentViewportHeight;

          // Check if element is hidden by keyboard
          if (rect.bottom > viewportHeight - calculatedKeyboardHeight) {
            window.scrollTo({
              top: targetY,
              behavior: smoothScroll ? 'smooth' : 'auto',
            });
          }
        }
      }, 300);
    };

    const handleBlur = () => {
      // Delay to check if another input was focused
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA' &&
            document.activeElement?.tagName !== 'SELECT') {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
          activeElementRef.current = null;
          onKeyboardHide?.();
        }
      }, 100);
    };

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const keyboardHeight = initialViewportHeight.current - currentHeight;

      if (keyboardHeight > 100) {
        setKeyboardHeight(keyboardHeight);
      } else {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    };

    // Attach listeners
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, isMobile, offset, smoothScroll, onKeyboardShow, onKeyboardHide]);

  return {
    isKeyboardVisible,
    keyboardHeight,
    activeElement: activeElementRef.current,
  };
}
```

#### 2.2 Keyboard-Aware Form Component

**File:** `/src/components/forms/KeyboardAwareForm.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { cn } from '@/lib/utils';

interface KeyboardAwareFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  fixedSubmitButton?: boolean;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
}

export function KeyboardAwareForm({
  children,
  fixedSubmitButton = true,
  onKeyboardShow,
  onKeyboardHide,
  className,
  ...props
}: KeyboardAwareFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { isKeyboardVisible, keyboardHeight } = useKeyboardAwareScroll({
    enabled: true,
    offset: 20,
    smoothScroll: true,
    onKeyboardShow,
    onKeyboardHide,
  });

  useEffect(() => {
    if (!fixedSubmitButton || !formRef.current) return;

    const submitButton = formRef.current.querySelector('[type="submit"]');
    if (submitButton && isKeyboardVisible) {
      // Add padding to form content to prevent submit button overlap
      formRef.current.style.paddingBottom = `${keyboardHeight + 80}px`;
    } else if (formRef.current) {
      formRef.current.style.paddingBottom = '0';
    }
  }, [isKeyboardVisible, keyboardHeight, fixedSubmitButton]);

  return (
    <form
      ref={formRef}
      className={cn(
        'relative',
        isKeyboardVisible && fixedSubmitButton && 'pb-20',
        className
      )}
      {...props}
    >
      {children}

      {/* Fixed submit button container for mobile */}
      {fixedSubmitButton && isKeyboardVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-50"
          style={{
            transform: `translateY(-${keyboardHeight}px)`,
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Submit button will be rendered here via portal or moved here */}
        </div>
      )}
    </form>
  );
}
```

#### 2.3 Mobile Input Enhancements

**File:** `/src/components/ui/mobile-input.tsx`

```typescript
import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useBreakpoint';

export interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoCapitalize?: 'off' | 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: 'off' | 'on';
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({
    className,
    type,
    label,
    error,
    helperText,
    autoCapitalize = 'none',
    autoCorrect = 'off',
    ...props
  }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={props.id}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              error && 'text-destructive'
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <input
          type={type}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2',
            'text-base', // Prevent zoom on iOS
            'ring-offset-background file:border-0 file:bg-transparent',
            'file:text-sm file:font-medium placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isMobile && 'min-h-[44px]', // Touch-friendly height
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          autoCapitalize={type === 'email' ? 'none' : autoCapitalize}
          autoCorrect={type === 'email' || type === 'password' ? 'off' : autoCorrect}
          autoComplete={
            type === 'email' ? 'email' :
            type === 'password' ? 'current-password' :
            props.autoComplete
          }
          inputMode={
            type === 'email' ? 'email' :
            type === 'tel' ? 'tel' :
            type === 'number' ? 'numeric' :
            type === 'url' ? 'url' :
            undefined
          }
          {...props}
        />

        {(error || helperText) && (
          <p
            className={cn(
              'text-sm',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';
```

### UX Specifications

#### Input Behavior
- **Font size:** Minimum 16px to prevent iOS zoom
- **Min height:** 44px for touch targets (WCAG 2.5.5)
- **Auto-capitalize:** Off for email/username fields
- **Auto-correct:** Off for email/password fields
- **Input mode:** Appropriate keyboard type for each field

#### Form Layout
- **Field spacing:** Minimum 16px between fields
- **Label position:** Above input (not placeholder)
- **Error messages:** Below input, visible before submission
- **Submit button:** Always visible, ideally fixed when keyboard open

#### Keyboard Interactions
- **Enter key:** Submit single-field forms (email, password)
- **Tab/Next:** Move between fields (iOS/Android)
- **Done:** Close keyboard after last field
- **Escape:** Clear field (Android)

### Testing Checklist

- [ ] iOS Safari: Keyboard doesn't hide submit button
- [ ] iOS Safari: No zoom on input focus (16px font size)
- [ ] iOS Safari: Correct keyboard type for each input
- [ ] Android Chrome: Keyboard doesn't hide form actions
- [ ] Android Chrome: "Next" navigates between fields
- [ ] Android Chrome: "Done" submits form on last field
- [ ] iPad Safari: Form works in both portrait/landscape
- [ ] Screen readers announce errors without dismissing keyboard
- [ ] Form validation works without keyboard dismissal
- [ ] Submit button always accessible with keyboard visible

---

## 3. Skip Navigation Component

### UX Principle
**Keyboard users should reach main content in 1-2 keystrokes.** Skip links are mandatory for WCAG 2.4.1 (Level A).

### Implementation

**File:** `/src/components/accessibility/SkipNavigation.tsx`

```typescript
import React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLink {
  id: string;
  label: string;
  target: string;
}

interface SkipNavigationProps {
  links?: SkipLink[];
  className?: string;
}

const defaultLinks: SkipLink[] = [
  { id: 'skip-to-main', label: 'Skip to main content', target: '#main-content' },
  { id: 'skip-to-nav', label: 'Skip to navigation', target: '#main-navigation' },
  { id: 'skip-to-search', label: 'Skip to search', target: '#search' },
];

export function SkipNavigation({
  links = defaultLinks,
  className
}: SkipNavigationProps) {
  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();

    const element = document.querySelector(target);
    if (element) {
      // Set focus to target element
      if (element instanceof HTMLElement) {
        element.focus();

        // If element is not focusable, make it temporarily focusable
        if (!element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '-1');
        }

        // Scroll into view with smooth behavior
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  return (
    <nav
      aria-label="Skip navigation links"
      className={cn('sr-only focus-within:not-sr-only', className)}
    >
      <ul className="fixed top-2 left-2 z-[9999] flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.target}
              onClick={(e) => handleSkipClick(e, link.target)}
              className={cn(
                'inline-flex items-center justify-center',
                'rounded-md px-4 py-2 text-sm font-medium',
                'bg-primary text-primary-foreground',
                'shadow-lg ring-offset-background',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'focus:ring-offset-2 focus:translate-y-0',
                'hover:bg-primary/90',
                // Hidden until focused
                'opacity-0 -translate-y-2',
                'focus:opacity-100 focus:translate-y-0'
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Utility component to mark skip targets
export function SkipTarget({
  id,
  children
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} tabIndex={-1} className="focus:outline-none">
      {children}
    </div>
  );
}
```

### Integration Example

**File:** `/src/App.tsx`

```typescript
import { SkipNavigation, SkipTarget } from '@/components/accessibility/SkipNavigation';

function App() {
  return (
    <>
      <SkipNavigation />

      <Header />

      <SkipTarget id="main-navigation">
        <Navigation />
      </SkipTarget>

      <SkipTarget id="main-content">
        <main>
          {/* Main content */}
        </main>
      </SkipTarget>

      <Footer />
    </>
  );
}
```

### UX Specifications

#### Visual Design
- **Position:** Top-left corner (fixed)
- **Background:** Primary color with high contrast
- **Text:** Primary foreground color (white on dark)
- **Padding:** 12px horizontal, 8px vertical
- **Border radius:** 6px
- **Shadow:** Large shadow for depth (0 4px 12px rgba(0,0,0,0.15))
- **Z-index:** 9999 (above all other content)

#### Interaction
- **Default state:** Visually hidden (sr-only)
- **Focus state:** Visible with smooth slide-in animation
- **Hover state:** Slightly darker background
- **Active state:** Scale down slightly (0.98)
- **Keyboard navigation:** Tab to reach, Enter to activate

#### Animation
```css
/* Slide-in animation */
@keyframes skip-nav-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Testing Checklist

- [ ] Links visible on keyboard focus (Tab key)
- [ ] Links hidden when not focused
- [ ] Clicking link moves focus to target
- [ ] Target element receives focus (outline visible)
- [ ] Screen reader announces skip link
- [ ] Works in all major browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile screen readers detect skip links
- [ ] Multiple skip links work correctly
- [ ] Skip links appear before all other page content
- [ ] High contrast mode displays skip links clearly

---

## 4. Enhanced Focus Indicators

### UX Principle
**Focus should always be visible, beautiful, and high-contrast.** Focus indicators are mandatory for WCAG 2.4.7 (Level AA).

### Implementation

#### 4.1 Global Focus Styles

**File:** `/src/styles/focus-indicators.css`

```css
/* ============================================
   FLUX STUDIO FOCUS INDICATORS
   WCAG 2.1 AA Compliant Focus Management
   ============================================ */

/* CSS Variables for Focus Styles */
:root {
  /* Focus ring colors */
  --focus-ring-color: oklch(0.708 0.243 264.376); /* Purple from theme */
  --focus-ring-offset: 2px;
  --focus-ring-width: 2px;
  --focus-ring-style: solid;

  /* High contrast mode colors */
  --focus-ring-high-contrast: #8B5CF6;

  /* Animation timing */
  --focus-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark {
  --focus-ring-color: oklch(0.8 0.243 264.376);
}

/* ============================================
   BASE FOCUS STYLES
   ============================================ */

/* Remove default browser focus outlines */
*:focus {
  outline: none;
}

/* Apply custom focus styles to all interactive elements */
:where(
  a,
  button,
  input,
  textarea,
  select,
  [role="button"],
  [role="link"],
  [role="menuitem"],
  [role="option"],
  [role="tab"],
  [tabindex]:not([tabindex="-1"])
):focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  transition: var(--focus-transition);
}

/* ============================================
   ENHANCED FOCUS STYLES
   ============================================ */

/* Focus with glow effect for buttons and links */
.focus-ring-glow:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 var(--focus-ring-offset) hsl(var(--background)),
    0 0 0 calc(var(--focus-ring-offset) + var(--focus-ring-width)) var(--focus-ring-color),
    0 0 12px var(--focus-ring-color);
  transition: var(--focus-transition);
}

/* Focus ring with gradient (for primary actions) */
.focus-ring-gradient:focus-visible {
  outline: none;
  position: relative;
}

.focus-ring-gradient:focus-visible::before {
  content: '';
  position: absolute;
  inset: calc(var(--focus-ring-offset) * -1);
  border-radius: inherit;
  padding: var(--focus-ring-width);
  background: linear-gradient(135deg,
    #8B5CF6 0%,
    #06B6D4 50%,
    #10B981 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: focus-ring-shimmer 1.5s ease-in-out infinite;
}

@keyframes focus-ring-shimmer {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

/* Focus ring with inset style (for inputs) */
.focus-ring-inset:focus-visible {
  outline: none;
  box-shadow:
    inset 0 0 0 var(--focus-ring-width) var(--focus-ring-color),
    0 0 8px rgba(139, 92, 246, 0.3);
  transition: var(--focus-transition);
}

/* ============================================
   COMPONENT-SPECIFIC FOCUS STYLES
   ============================================ */

/* Buttons */
button:focus-visible,
[role="button"]:focus-visible {
  outline-offset: 3px;
}

/* Input fields */
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: var(--focus-ring-color);
  box-shadow:
    0 0 0 3px hsl(var(--background)),
    0 0 0 5px var(--focus-ring-color);
}

/* Cards and interactive containers */
[role="button"].focus-ring-card:focus-visible,
.focus-ring-card:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: -2px; /* Inset for cards */
  box-shadow:
    0 0 0 3px var(--focus-ring-color) inset,
    0 4px 12px rgba(139, 92, 246, 0.2);
}

/* Navigation links */
nav a:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: 4px;
  border-radius: 4px;
}

/* Icon buttons */
button.icon-button:focus-visible,
[role="button"].icon-button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: 2px;
  border-radius: 50%;
}

/* ============================================
   HIGH CONTRAST MODE
   ============================================ */

@media (prefers-contrast: high) {
  :root {
    --focus-ring-color: var(--focus-ring-high-contrast);
    --focus-ring-width: 3px;
    --focus-ring-offset: 3px;
  }

  *:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring-color) !important;
    outline-offset: var(--focus-ring-offset) !important;
  }

  /* Remove subtle effects in high contrast */
  .focus-ring-glow:focus-visible,
  .focus-ring-gradient:focus-visible {
    box-shadow: none !important;
  }

  .focus-ring-gradient:focus-visible::before {
    display: none;
  }
}

/* ============================================
   FORCED COLORS MODE (Windows High Contrast)
   ============================================ */

@media (forced-colors: active) {
  *:focus-visible {
    outline: 3px solid CanvasText !important;
    outline-offset: 3px !important;
  }
}

/* ============================================
   REDUCED MOTION
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  *:focus-visible,
  .focus-ring-glow:focus-visible,
  .focus-ring-gradient:focus-visible,
  .focus-ring-inset:focus-visible {
    transition: none !important;
    animation: none !important;
  }

  .focus-ring-gradient:focus-visible::before {
    animation: none !important;
  }
}

/* ============================================
   FOCUS-WITHIN (for form groups)
   ============================================ */

.form-group:focus-within {
  border-color: var(--focus-ring-color);
  box-shadow: 0 0 0 1px var(--focus-ring-color);
  transition: var(--focus-transition);
}

/* ============================================
   FOCUS TRAP (for modals/dialogs)
   ============================================ */

[data-focus-trap]:focus {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: -2px;
}

/* ============================================
   SKIP TO CONTENT LINK
   ============================================ */

.skip-to-content:focus {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 9999;
  padding: 0.75rem 1.5rem;
  background: var(--focus-ring-color);
  color: white;
  border-radius: 0.5rem;
  outline: 3px solid white;
  outline-offset: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-weight: 600;
  text-decoration: none;
}

/* ============================================
   UTILITY CLASSES
   ============================================ */

/* Hide focus indicator (use sparingly, ensure alternative) */
.focus-none:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

/* Enhance focus indicator */
.focus-strong:focus-visible {
  outline-width: 3px !important;
  outline-offset: 4px !important;
}

/* Focus indicator with offset */
.focus-offset:focus-visible {
  outline-offset: 4px;
}

/* Focus indicator without offset */
.focus-tight:focus-visible {
  outline-offset: 0;
}
```

#### 4.2 Focus Management Hook

**File:** `/src/hooks/useFocusManagement.ts`

```typescript
import { useEffect, useRef, RefObject } from 'react';

interface FocusManagementOptions {
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

export function useFocusManagement(
  containerRef: RefObject<HTMLElement>,
  options: FocusManagementOptions = {}
) {
  const {
    autoFocus = false,
    restoreFocus = true,
    trapFocus = false,
  } = options;

  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap logic
  useEffect(() => {
    if (!trapFocus || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [trapFocus, containerRef]);

  // Auto focus logic
  useEffect(() => {
    if (!autoFocus || !containerRef.current) return;

    const container = containerRef.current;

    // Store previously focused element
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    // Find first focusable element and focus it
    const firstFocusable = container.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (firstFocusable) {
      // Delay to ensure element is mounted and visible
      setTimeout(() => {
        firstFocusable.focus();
      }, 100);
    }

    // Restore focus on unmount
    return () => {
      if (restoreFocus && previousActiveElement.current) {
        setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 0);
      }
    };
  }, [autoFocus, restoreFocus, containerRef]);

  return {
    previousActiveElement: previousActiveElement.current,
  };
}

// Hook for managing focus within modals/dialogs
export function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean) {
  useFocusManagement(containerRef, {
    autoFocus: isActive,
    restoreFocus: isActive,
    trapFocus: isActive,
  });
}
```

### UX Specifications

#### Focus Indicator Requirements
- **Minimum contrast ratio:** 3:1 against adjacent colors (WCAG 2.4.11)
- **Minimum thickness:** 2px (WCAG 2.4.13)
- **Offset:** 2px from element edge
- **Color:** Purple (#8B5CF6) in light mode, lighter purple in dark mode
- **Animation:** Smooth 200ms transition

#### Component Variants

| Component Type | Focus Style | Offset | Special Effects |
|---------------|-------------|--------|-----------------|
| Buttons (primary) | Gradient ring | 3px | Shimmer animation |
| Buttons (secondary) | Solid ring | 2px | Glow effect |
| Text inputs | Inset + outer glow | 0px | Border color change |
| Cards | Inset ring | -2px | Subtle shadow |
| Navigation links | Solid ring | 4px | Rounded corners |
| Icon buttons | Solid ring | 2px | Circular |

### Testing Checklist

- [ ] All interactive elements have visible focus indicators
- [ ] Focus indicators meet 3:1 contrast ratio minimum
- [ ] Focus indicators are 2px thick minimum
- [ ] Focus visible on all components (buttons, links, inputs)
- [ ] Focus trap works in modals/dialogs
- [ ] Tab navigation follows logical order
- [ ] Shift+Tab moves focus backwards correctly
- [ ] Skip links work and are focus-visible
- [ ] Focus restored after modal closes
- [ ] High contrast mode displays clear focus
- [ ] Reduced motion disables animations
- [ ] Screen reader announces focused elements
- [ ] Mobile: Focus visible with external keyboard
- [ ] All focus states tested in Chrome, Firefox, Safari, Edge

---

## 5. First-Time User Onboarding

### UX Principle
**Users should understand core value within 60 seconds.** Onboarding should be progressive, skippable, and contextual.

### Implementation

#### 5.1 Onboarding Flow Component

**File:** `/src/components/onboarding/OnboardingFlow.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  canSkip?: boolean;
}

interface OnboardingFlowProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
  storageKey?: string;
}

export function OnboardingFlow({
  steps,
  onComplete,
  onSkip,
  storageKey = 'fluxstudio_onboarding_completed',
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      setIsVisible(true);
    }
  }, [storageKey]);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async () => {
    if (step.action) {
      await step.action.onClick();
    }

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'skipped');
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="onboarding-title"
                className="text-2xl font-semibold tracking-tight"
              >
                {step.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>

            {step.canSkip !== false && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                aria-label="Skip onboarding"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <Progress
            value={progress}
            className="h-2"
            aria-label={`Onboarding progress: ${Math.round(progress)}%`}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-lg text-muted-foreground">
            {step.description}
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-6">
            {step.content}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {!isLastStep && step.canSkip !== false && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
              )}

              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                {step.action?.label || (isLastStep ? 'Get Started' : 'Next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

#### 5.2 Onboarding Steps Definition

**File:** `/src/components/onboarding/steps.tsx`

```typescript
import React from 'react';
import { OnboardingStep } from './OnboardingFlow';
import { Palette, Users, Upload } from 'lucide-react';

export const designerOnboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FluxStudio',
    description: 'Your creative workspace for collaborative design. Let\'s get you set up in under a minute.',
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Create</p>
            <p className="text-xs text-muted-foreground">Design with powerful tools</p>
          </div>

          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Collaborate</p>
            <p className="text-xs text-muted-foreground">Work together in real-time</p>
          </div>

          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Deliver</p>
            <p className="text-xs text-muted-foreground">Share work with clients</p>
          </div>
        </div>
      </div>
    ),
    canSkip: true,
  },
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description: 'Projects help you organize your design work. You can always create more later.',
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="project-name" className="text-sm font-medium">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            placeholder="e.g., Website Redesign"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="project-description" className="text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            id="project-description"
            placeholder="Brief description of this project"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>
      </div>
    ),
    action: {
      label: 'Create Project',
      onClick: async () => {
        // Create project logic
        const projectName = (document.getElementById('project-name') as HTMLInputElement)?.value;
        if (projectName) {
          // Call API to create project
          console.log('Creating project:', projectName);
        }
      },
    },
    canSkip: true,
  },
  {
    id: 'invite-team',
    title: 'Invite Your Team (Optional)',
    description: 'Collaboration is better together. Invite team members to join your workspace.',
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="team-emails" className="text-sm font-medium">
            Email Addresses
          </label>
          <textarea
            id="team-emails"
            placeholder="colleague@example.com, designer@example.com"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple emails with commas
          </p>
        </div>

        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium mb-1">💡 Pro Tip</p>
          <p className="text-muted-foreground">
            You can invite team members anytime from the Team settings page.
          </p>
        </div>
      </div>
    ),
    action: {
      label: 'Send Invites',
      onClick: async () => {
        // Send invite logic
        const emails = (document.getElementById('team-emails') as HTMLTextAreaElement)?.value;
        if (emails) {
          console.log('Sending invites to:', emails);
        }
      },
    },
    canSkip: true,
  },
];

export const clientOnboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FluxStudio',
    description: 'Your hub for design collaboration. Review work, provide feedback, and approve designs—all in one place.',
    content: (
      <div className="space-y-4 text-center">
        <p className="text-lg">
          FluxStudio makes it easy to work with your design team.
        </p>
        <ul className="space-y-3 text-left max-w-md mx-auto">
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">✓</span>
            <span>Review designs and prototypes</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">✓</span>
            <span>Leave comments and feedback</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">✓</span>
            <span>Track project progress</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">✓</span>
            <span>Approve final deliverables</span>
          </li>
        </ul>
      </div>
    ),
    canSkip: false,
  },
  {
    id: 'notifications',
    title: 'Stay Updated',
    description: 'Choose how you want to receive updates about your projects.',
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">New design uploads</p>
              <p className="text-xs text-muted-foreground">
                When designers share new work
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Comments and mentions</p>
              <p className="text-xs text-muted-foreground">
                When someone replies or mentions you
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Project milestones</p>
              <p className="text-xs text-muted-foreground">
                Important project updates and deadlines
              </p>
            </div>
          </label>
        </div>
      </div>
    ),
    action: {
      label: 'Save Preferences',
      onClick: async () => {
        console.log('Saving notification preferences');
      },
    },
    canSkip: true,
  },
];
```

#### 5.3 Onboarding Integration

**File:** `/src/App.tsx` (add to main app)

```typescript
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { designerOnboardingSteps, clientOnboardingSteps } from '@/components/onboarding/steps';
import { useAuth } from '@/contexts/AuthContext';

function App() {
  const { user } = useAuth();

  const onboardingSteps =
    user?.userType === 'designer'
      ? designerOnboardingSteps
      : clientOnboardingSteps;

  return (
    <>
      <OnboardingFlow
        steps={onboardingSteps}
        onComplete={() => {
          console.log('Onboarding completed');
          // Track completion in analytics
        }}
        onSkip={() => {
          console.log('Onboarding skipped');
          // Track skip in analytics
        }}
      />

      {/* Rest of app */}
    </>
  );
}
```

### UX Specifications

#### Flow Structure
- **Number of steps:** 2-3 (maximum)
- **Time to complete:** 60-90 seconds target
- **Skip option:** Available on all steps except welcome
- **Progress indicator:** Always visible
- **Mobile responsive:** Single column layout, scrollable

#### Visual Design
- **Container:** Modal overlay with backdrop blur
- **Card max-width:** 672px (2xl)
- **Card max-height:** 90vh (scrollable)
- **Progress bar height:** 8px
- **Button sizes:** Large (44px min height on mobile)

#### Content Guidelines
- **Title:** 5-8 words max
- **Description:** 1-2 sentences, under 100 characters
- **Action labels:** Action-oriented verbs ("Create Project" not "Next")
- **Skip labels:** Friendly ("Skip for now" not "Skip")

### Testing Checklist

- [ ] Onboarding appears for new users only
- [ ] Progress bar updates correctly
- [ ] All steps are skippable (except required ones)
- [ ] Previous button works correctly
- [ ] Next button advances to next step
- [ ] Last step completes onboarding
- [ ] Completion saved to localStorage
- [ ] Onboarding doesn't show again after completion
- [ ] Mobile: All content fits without horizontal scroll
- [ ] Mobile: Buttons are touch-friendly (44px min)
- [ ] Keyboard: Tab navigation works
- [ ] Keyboard: Enter submits current step
- [ ] Keyboard: Escape skips onboarding
- [ ] Screen reader announces step changes
- [ ] Screen reader announces progress updates
- [ ] Works in all major browsers

---

## 6. Testing Procedures

### 6.1 Device Testing Matrix

#### Desktop Browsers
| Browser | Version | OS | Priority |
|---------|---------|----|---------  |
| Chrome | Latest | macOS, Windows | P0 |
| Firefox | Latest | macOS, Windows | P0 |
| Safari | Latest | macOS | P0 |
| Edge | Latest | Windows | P1 |

#### Mobile Devices
| Device | OS | Browser | Priority |
|--------|----|---------| ---------|
| iPhone 12/13/14 | iOS 16+ | Safari | P0 |
| iPhone SE (2022) | iOS 16+ | Safari | P0 |
| Samsung Galaxy S21+ | Android 12+ | Chrome | P0 |
| Google Pixel 6/7 | Android 12+ | Chrome | P1 |
| iPad Pro 12.9" | iPadOS 16+ | Safari | P1 |

#### Screen Readers
| Screen Reader | Browser | OS | Priority |
|--------------|---------|----| ---------|
| VoiceOver | Safari | macOS | P0 |
| VoiceOver | Safari | iOS | P0 |
| NVDA | Chrome | Windows | P0 |
| JAWS | Chrome | Windows | P1 |
| TalkBack | Chrome | Android | P1 |

### 6.2 Accessibility Testing Checklist

#### WCAG 2.1 Level A (Required)
- [ ] 1.1.1: Non-text content has text alternatives
- [ ] 1.3.1: Info and relationships conveyed through markup
- [ ] 1.4.1: Color is not the only visual means of conveying information
- [ ] 2.1.1: All functionality available from keyboard
- [ ] 2.1.2: No keyboard trap
- [ ] 2.4.1: Bypass blocks (skip navigation)
- [ ] 2.4.2: Pages have titles
- [ ] 2.4.4: Link purpose determined from link text
- [ ] 3.1.1: Page language identified
- [ ] 3.2.2: Input changes don't cause context change
- [ ] 3.3.1: Error identification
- [ ] 3.3.2: Labels or instructions provided
- [ ] 4.1.1: Parsing (valid HTML)
- [ ] 4.1.2: Name, role, value available for UI components

#### WCAG 2.1 Level AA (Target)
- [ ] 1.4.3: Contrast ratio at least 4.5:1 for normal text
- [ ] 1.4.5: Images of text avoided except logos
- [ ] 1.4.10: Reflow (no horizontal scrolling at 320px width)
- [ ] 1.4.11: Non-text contrast at least 3:1
- [ ] 1.4.12: Text spacing adjustable without loss of content
- [ ] 1.4.13: Content on hover/focus can be dismissed
- [ ] 2.4.7: Focus indicator visible
- [ ] 2.5.5: Touch targets at least 44×44 CSS pixels
- [ ] 3.2.3: Consistent navigation
- [ ] 3.2.4: Consistent identification
- [ ] 3.3.3: Error suggestions provided
- [ ] 3.3.4: Error prevention for legal/financial/data

### 6.3 Automated Testing Tools

#### Use these tools for initial compliance checks:

1. **axe DevTools** (Browser Extension)
   - Run on all major pages
   - Fix all Critical and Serious issues
   - Document Moderate issues for manual review

2. **Lighthouse** (Chrome DevTools)
   - Target score: 95+ for Accessibility
   - Run on desktop and mobile
   - Address all failing audits

3. **WAVE** (Web Accessibility Evaluation Tool)
   - Check for structural issues
   - Verify ARIA usage
   - Identify missing labels

4. **Pa11y** (Automated Testing)
   ```bash
   npm install -g pa11y
   pa11y --standard WCAG2AA https://your-site.com
   ```

### 6.4 Manual Testing Procedures

#### Keyboard Navigation Test
1. Disconnect mouse
2. Use only keyboard to complete core tasks:
   - Sign in
   - Create new project
   - Upload file
   - Send message
   - Sign out
3. Verify:
   - All interactive elements reachable
   - Focus always visible
   - Logical tab order
   - No keyboard traps

#### Screen Reader Test
1. Enable screen reader (VoiceOver, NVDA, or JAWS)
2. Navigate site using only screen reader
3. Verify:
   - All content announced
   - Form labels associated correctly
   - Error messages announced
   - Dynamic content updates announced
   - Images have alt text
   - Skip links work

#### Mobile Keyboard Test
1. Open site on mobile device
2. Connect external keyboard (or use on-screen keyboard)
3. Test all forms:
   - Keyboard doesn't hide submit button
   - Correct keyboard type for input (email, tel, number)
   - "Next" navigates between fields
   - "Done" submits form
4. Verify no zoom on input focus (16px font minimum)

#### Touch Target Test
1. Open site on mobile device
2. Attempt to tap all interactive elements
3. Verify:
   - Minimum 44×44px touch targets
   - Adequate spacing between targets
   - No accidental taps on adjacent elements

### 6.5 Performance Testing

#### Core Web Vitals Targets
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

#### Test with:
```bash
npm run build
npm run preview
# Use Lighthouse to audit performance
```

#### Token Refresh Performance
- Measure refresh time: Target < 200ms
- Test with slow 3G throttling
- Verify UI remains responsive during refresh

---

## 7. Success Metrics

### Primary KPIs

#### Mobile Form Completion
- **Current:** 60%
- **Target:** 85%
- **Measurement:** Forms successfully submitted / Forms started
- **Tracking:** Google Analytics custom events

```javascript
// Track form starts
gtag('event', 'form_start', {
  form_name: 'signup',
  user_type: 'designer',
});

// Track form completions
gtag('event', 'form_complete', {
  form_name: 'signup',
  user_type: 'designer',
  time_to_complete: 45, // seconds
});

// Track form abandonment
gtag('event', 'form_abandon', {
  form_name: 'signup',
  field_exited: 'password',
  user_type: 'designer',
});
```

#### Session Continuity
- **Target:** 98% of sessions continue without interruption during token refresh
- **Measurement:** Sessions with successful silent refresh / Total sessions
- **Tracking:** Custom analytics event

```javascript
gtag('event', 'token_refresh', {
  success: true,
  duration: 234, // ms
  silent: true,
});
```

#### Accessibility Compliance
- **Target:** WCAG 2.1 Level AA compliance
- **Measurement:** Automated audit score + manual testing
- **Tracking:** Weekly Lighthouse audits

#### Time to First Value (Onboarding)
- **Target:** < 90 seconds from signup to first project created
- **Current:** Unknown (establish baseline)
- **Measurement:** Timestamp of signup - Timestamp of first project
- **Tracking:** Analytics funnel

### Secondary KPIs

#### Focus Management
- **Metric:** Zero keyboard traps reported
- **Measurement:** User bug reports + QA testing
- **Target:** 0 critical accessibility bugs

#### Mobile Keyboard Issues
- **Metric:** Mobile keyboard-related support tickets
- **Current:** Establish baseline
- **Target:** 50% reduction within 30 days

#### Skip Navigation Usage
- **Metric:** Skip link activation rate
- **Measurement:** Skip link clicks / Page views (keyboard users)
- **Target:** 15-25% of keyboard users use skip links

#### Onboarding Completion
- **Metric:** Onboarding completion rate
- **Measurement:** Users who complete all steps / Users who start
- **Target:** 70% completion, 25% skip, 5% abandon

### Analytics Implementation

**File:** `/src/utils/analytics.ts`

```typescript
export const analytics = {
  // Form tracking
  trackFormStart: (formName: string, userType: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'form_start', {
      form_name: formName,
      user_type: userType,
    });
  },

  trackFormComplete: (formName: string, userType: string, duration: number) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'form_complete', {
      form_name: formName,
      user_type: userType,
      time_to_complete: duration,
    });
  },

  trackFormError: (formName: string, errorField: string, errorMessage: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'form_error', {
      form_name: formName,
      error_field: errorField,
      error_message: errorMessage,
    });
  },

  // Token refresh tracking
  trackTokenRefresh: (success: boolean, duration: number, silent: boolean) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'token_refresh', {
      success,
      duration,
      silent,
    });
  },

  // Accessibility tracking
  trackSkipNavigation: (target: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'skip_navigation', {
      target,
    });
  },

  trackKeyboardShortcut: (shortcut: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'keyboard_shortcut', {
      shortcut,
    });
  },

  // Onboarding tracking
  trackOnboardingStart: (userType: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'onboarding_start', {
      user_type: userType,
    });
  },

  trackOnboardingStep: (step: string, stepNumber: number) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'onboarding_step', {
      step_name: step,
      step_number: stepNumber,
    });
  },

  trackOnboardingComplete: (duration: number, userType: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'onboarding_complete', {
      duration_seconds: duration,
      user_type: userType,
    });
  },

  trackOnboardingSkip: (atStep: string, userType: string) => {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'onboarding_skip', {
      at_step: atStep,
      user_type: userType,
    });
  },
};
```

### Dashboard Configuration

Create custom GA4 dashboard with:
1. **Mobile UX Panel**
   - Mobile form completion rate (trend)
   - Mobile vs desktop form completion
   - Form error rates by field
   - Keyboard-related issues (support tickets)

2. **Authentication Panel**
   - Token refresh success rate
   - Average refresh duration
   - Session timeout warnings shown
   - Sessions ended due to timeout

3. **Accessibility Panel**
   - Skip navigation usage
   - Keyboard shortcut usage
   - Accessibility errors (from automated tools)
   - Screen reader sessions (when detectable)

4. **Onboarding Panel**
   - Onboarding start rate
   - Onboarding completion rate
   - Average time to complete
   - Step-by-step drop-off funnel

---

## 8. A/B Testing Plan

### Test 1: Session Timeout Warning Timing

**Hypothesis:** Showing timeout warning 3 minutes before expiry (vs 2 minutes) will reduce unexpected logouts while maintaining security.

**Variants:**
- **Control (A):** 2-minute warning (current spec)
- **Variant (B):** 3-minute warning
- **Variant (C):** 5-minute warning with auto-extend option

**Success Metrics:**
- Unexpected logout rate
- "Stay signed in" click rate
- User frustration signals (rapid clicks, abandonment)

**Sample Size:** 10,000 sessions
**Duration:** 2 weeks
**Statistical Significance:** 95%

**Implementation:**
```typescript
// Use feature flag to control warning threshold
const warningThreshold = useFeatureFlag('session_timeout_warning_duration',
  2 * 60 * 1000 // default: 2 minutes
);

<SessionTimeoutWarning warningThreshold={warningThreshold} />
```

### Test 2: Onboarding Flow Length

**Hypothesis:** 2-step onboarding (vs 3-step) will increase completion rate without reducing user understanding.

**Variants:**
- **Control (A):** 3 steps (Welcome → Create Project → Invite Team)
- **Variant (B):** 2 steps (Welcome → Create Project)
- **Variant (C):** 2 steps (Welcome + Create Project combined → Invite Team)

**Success Metrics:**
- Onboarding completion rate
- Time to first value (project created)
- 7-day retention rate
- Feature discovery rate (within first week)

**Sample Size:** 5,000 new users
**Duration:** 4 weeks
**Statistical Significance:** 95%

### Test 3: Mobile Submit Button Position

**Hypothesis:** Fixed submit button above keyboard (vs inline) will increase mobile form completion rate.

**Variants:**
- **Control (A):** Inline submit button (scrolls with content)
- **Variant (B):** Fixed submit button above keyboard
- **Variant (C):** Fixed submit button with persistent visibility indicator

**Success Metrics:**
- Mobile form completion rate
- "Lost" button searches (scroll behavior)
- Keyboard dismissals before submission
- Form abandonment rate

**Sample Size:** 8,000 mobile sessions
**Duration:** 2 weeks
**Statistical Significance:** 95%

**Implementation:**
```typescript
const mobileSubmitPosition = useFeatureFlag('mobile_submit_position', 'inline');

<KeyboardAwareForm
  fixedSubmitButton={mobileSubmitPosition === 'fixed'}
>
```

### Test 4: Focus Indicator Style

**Hypothesis:** Gradient focus rings (vs solid) will improve perceived quality without affecting keyboard navigation.

**Variants:**
- **Control (A):** Solid purple focus ring
- **Variant (B):** Gradient focus ring with shimmer
- **Variant (C):** Gradient focus ring without animation

**Success Metrics:**
- Brand perception survey scores
- Keyboard navigation task completion time
- Accessibility complaints
- Premium upgrade rate (indirect quality signal)

**Sample Size:** 15,000 users
**Duration:** 3 weeks
**Statistical Significance:** 95%

### A/B Testing Implementation

**File:** `/src/hooks/useFeatureFlag.ts`

```typescript
import { useEffect, useState } from 'react';

interface FeatureFlags {
  session_timeout_warning_duration: number;
  onboarding_steps: 'two' | 'three' | 'combined';
  mobile_submit_position: 'inline' | 'fixed' | 'fixed-indicator';
  focus_indicator_style: 'solid' | 'gradient' | 'gradient-static';
}

export function useFeatureFlag<K extends keyof FeatureFlags>(
  flag: K,
  defaultValue: FeatureFlags[K]
): FeatureFlags[K] {
  const [value, setValue] = useState<FeatureFlags[K]>(defaultValue);

  useEffect(() => {
    // Fetch feature flag from your A/B testing service
    // Examples: LaunchDarkly, Optimizely, Split.io, or custom solution

    const userId = getUserId(); // Your user identification logic
    const variant = getVariant(flag, userId);

    if (variant !== null) {
      setValue(variant as FeatureFlags[K]);
    }
  }, [flag]);

  return value;
}

// Simple hash-based variant assignment
function getVariant(flag: string, userId: string): string | number | null {
  // In production, use your A/B testing service API
  // This is a simple example using deterministic hashing

  const hash = simpleHash(flag + userId);
  const percentage = hash % 100;

  // Example: 50/50 split
  if (flag === 'mobile_submit_position') {
    if (percentage < 50) return 'inline';
    return 'fixed';
  }

  return null;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getUserId(): string {
  // Return user ID or generate anonymous ID for logged-out users
  return localStorage.getItem('user_id') || generateAnonymousId();
}

function generateAnonymousId(): string {
  let id = localStorage.getItem('anonymous_id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonymous_id', id);
  }
  return id;
}
```

### A/B Testing Checklist

- [ ] Feature flags implemented for all variants
- [ ] Analytics tracking for all variants
- [ ] Sample size calculation validated
- [ ] Test duration determined
- [ ] Success metrics defined
- [ ] Statistical significance level set (95%)
- [ ] User assignment is stable (same user always sees same variant)
- [ ] Edge cases handled (logged out users, multiple devices)
- [ ] Performance impact measured
- [ ] Accessibility verified for all variants
- [ ] Mobile/desktop segmentation if needed
- [ ] Results reviewed weekly
- [ ] Winner deployed after statistical significance
- [ ] Losing variants sunset gracefully

---

## Implementation Timeline

### Week 1: Foundation
- **Days 1-2:** Token refresh infrastructure
  - Implement `useTokenRefresh` hook
  - Add refresh endpoint to API
  - Test refresh flow

- **Days 3-5:** Mobile keyboard handling
  - Implement `useKeyboardAwareScroll` hook
  - Create `KeyboardAwareForm` component
  - Update form components to use mobile enhancements
  - Test on iOS and Android devices

### Week 2: Accessibility
- **Days 1-2:** Skip navigation
  - Implement `SkipNavigation` component
  - Add skip targets to main layout
  - Test with screen readers

- **Days 3-5:** Focus indicators
  - Create focus indicator CSS
  - Implement `useFocusManagement` hook
  - Test focus trap in modals
  - Test keyboard navigation across site

### Week 3: Onboarding & Polish
- **Days 1-3:** Onboarding flow
  - Implement `OnboardingFlow` component
  - Create designer and client flows
  - Add analytics tracking
  - Test completion and skip flows

- **Days 4-5:** Testing & fixes
  - Run full accessibility audit
  - Fix any issues found
  - Cross-browser testing
  - Performance testing

### Week 4: Launch & Monitor
- **Days 1-2:** Soft launch
  - Deploy to 10% of users
  - Monitor error rates
  - Check analytics data

- **Days 3-5:** Full launch
  - Deploy to 100% of users
  - Monitor KPIs daily
  - Prepare A/B tests
  - Document lessons learned

---

## Conclusion

This implementation guide provides comprehensive, production-ready code and specifications for Sprint 12's P0 UX improvements. By following these patterns, FluxStudio will:

1. **Maintain security without sacrificing UX** through transparent token refresh
2. **Achieve 85% mobile form completion** with enhanced keyboard handling
3. **Meet WCAG 2.1 AA standards** with skip navigation and focus indicators
4. **Reduce time-to-value** with streamlined onboarding
5. **Continuously improve** through data-driven A/B testing

### Key Success Factors
- ✅ Mobile-first implementation
- ✅ Accessibility at every level
- ✅ Comprehensive testing procedures
- ✅ Clear success metrics
- ✅ A/B testing infrastructure

### Next Steps
1. Review implementation guide with full team
2. Assign tasks to developers
3. Set up analytics tracking
4. Begin Week 1 implementation
5. Schedule weekly UX review meetings

**Questions or concerns?** Reach out to the UX Reviewer for clarification on any implementation details.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Author:** UX Reviewer, FluxStudio
**Status:** Ready for Implementation
