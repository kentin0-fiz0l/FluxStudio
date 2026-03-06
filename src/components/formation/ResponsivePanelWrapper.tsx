/**
 * ResponsivePanelWrapper - Adaptive panel layout by screen size
 *
 * Renders drill panels in three modes depending on the viewport:
 *   - Desktop (md+): right sidebar (current behavior, no backdrop)
 *   - Tablet (sm-md): bottom sheet (slides up from bottom, draggable handle)
 *   - Mobile (<sm): full-screen modal with close button
 *
 * Uses Tailwind responsive utility classes exclusively (no JS media queries
 * for rendering logic). CSS transitions handle enter/exit animations.
 * Backdrop overlay is shown on mobile and tablet.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { X, GripHorizontal } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ResponsivePanelWrapperProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Title displayed in the panel header (mobile/tablet only) */
  title: string;
  /** Preferred desktop position hint */
  position?: 'right' | 'bottom';
  /** Panel contents */
  children: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum sheet height as a percentage of viewport when dragging */
const SHEET_MIN_HEIGHT_VH = 20;
/** Maximum sheet height as a percentage of viewport */
const SHEET_MAX_HEIGHT_VH = 85;
/** Default sheet height as a percentage of viewport */
const SHEET_DEFAULT_HEIGHT_VH = 50;
/** Drag distance (px) to trigger dismiss */
const DISMISS_THRESHOLD = 120;

// ============================================================================
// Component
// ============================================================================

export const ResponsivePanelWrapper: React.FC<ResponsivePanelWrapperProps> = ({
  isOpen,
  onClose,
  title,
  position: _position = 'right',
  children,
}) => {
  // Track whether the panel has been mounted for at least one frame so
  // CSS transitions can animate from the "closed" state to "open".
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Sheet drag state (tablet bottom-sheet mode)
  const [sheetHeight, setSheetHeight] = useState(SHEET_DEFAULT_HEIGHT_VH);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(SHEET_DEFAULT_HEIGHT_VH);

  // ---- Mount/unmount animation lifecycle ----
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Request animation frame so the initial "closed" styles are painted first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      // Wait for the exit transition before unmounting
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ---- Escape key to close ----
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ---- Lock body scroll on mobile/tablet when open ----
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    // Only lock on small screens; desktop sidebar doesn't need it.
    // We use a simple width check here (not a media query listener)
    // because this is a side-effect, not a rendering decision.
    if (window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // ---- Sheet drag handlers ----
  const handleDragStart = useCallback(
    (clientY: number) => {
      dragStartY.current = clientY;
      dragStartHeight.current = sheetHeight;
    },
    [sheetHeight],
  );

  const handleDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    const deltaVh = ((dragStartY.current - clientY) / window.innerHeight) * 100;
    const newHeight = Math.min(
      SHEET_MAX_HEIGHT_VH,
      Math.max(SHEET_MIN_HEIGHT_VH, dragStartHeight.current + deltaVh),
    );
    setSheetHeight(newHeight);
  }, []);

  const handleDragEnd = useCallback(
    (clientY: number) => {
      if (dragStartY.current === null) return;
      const dragDistance = clientY - dragStartY.current;
      dragStartY.current = null;

      // If dragged far enough downward, dismiss
      if (dragDistance > DISMISS_THRESHOLD) {
        onClose();
        // Reset for next open
        setSheetHeight(SHEET_DEFAULT_HEIGHT_VH);
      }
    },
    [onClose],
  );

  // Pointer event wrappers for the drag handle
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      handleDragStart(e.clientY);
    },
    [handleDragStart],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      handleDragMove(e.clientY);
    },
    [handleDragMove],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      handleDragEnd(e.clientY);
    },
    [handleDragEnd],
  );

  if (!mounted) return null;

  return (
    <>
      {/* ================================================================== */}
      {/* BACKDROP — visible on mobile (<sm) and tablet (sm-md) only         */}
      {/* ================================================================== */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/40 md:hidden
          transition-opacity duration-300
          ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ================================================================== */}
      {/* DESKTOP (md+): Right sidebar                                       */}
      {/* ================================================================== */}
      <div
        className={`
          hidden md:flex
          fixed top-0 right-0 h-full w-80
          z-50 flex-col
          bg-white dark:bg-gray-800
          border-l border-gray-200 dark:border-gray-700
          shadow-lg
          transition-transform duration-300 ease-in-out
          ${visible ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-label={title}
      >
        {children}
      </div>

      {/* ================================================================== */}
      {/* TABLET (sm-md): Bottom sheet                                       */}
      {/* ================================================================== */}
      <div
        className={`
          hidden sm:flex md:hidden
          fixed bottom-0 left-0 right-0
          z-50 flex-col
          bg-white dark:bg-gray-800
          border-t border-gray-200 dark:border-gray-700
          rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-in-out
          ${visible ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ height: `${sheetHeight}vh` }}
        role="dialog"
        aria-label={title}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <GripHorizontal className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg
                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>

      {/* ================================================================== */}
      {/* MOBILE (<sm): Full-screen modal                                    */}
      {/* ================================================================== */}
      <div
        className={`
          flex sm:hidden
          fixed inset-0
          z-50 flex-col
          bg-white dark:bg-gray-800
          transition-transform duration-300 ease-in-out
          ${visible ? 'translate-y-0' : 'translate-y-full'}
        `}
        role="dialog"
        aria-label={title}
        aria-modal="true"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
};

export default ResponsivePanelWrapper;
