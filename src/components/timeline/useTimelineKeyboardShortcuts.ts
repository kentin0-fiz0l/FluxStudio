/**
 * useTimelineKeyboardShortcuts - Keyboard shortcuts for timeline editor
 *
 * Provides standard video editor keyboard shortcuts.
 */

import * as React from 'react';

interface TimelineShortcutHandlers {
  onPlayPause?: () => void;
  onStop?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onSplit?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onFrameBack?: () => void;
  onFrameForward?: () => void;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;
}

interface UseTimelineKeyboardShortcutsOptions extends TimelineShortcutHandlers {
  enabled?: boolean;
}

export function useTimelineKeyboardShortcuts(options: UseTimelineKeyboardShortcutsOptions) {
  const {
    enabled = true,
    onPlayPause,
    onStop,
    onUndo,
    onRedo,
    onDelete,
    onCopy,
    onCut,
    onPaste,
    onSelectAll,
    onSplit,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onFrameBack,
    onFrameForward,
    onGoToStart,
    onGoToEnd,
  } = options;

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow some shortcuts even in inputs
        if (e.key !== 'Escape') return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Play/Pause - Space
      if (e.key === ' ' && !isCtrlOrCmd) {
        e.preventDefault();
        onPlayPause?.();
        return;
      }

      // Stop - Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onStop?.();
        return;
      }

      // Undo - Ctrl/Cmd + Z
      if (e.key === 'z' && isCtrlOrCmd && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Redo - Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.key === 'z' && isCtrlOrCmd && e.shiftKey) || (e.key === 'y' && isCtrlOrCmd)) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Delete - Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.();
        return;
      }

      // Copy - Ctrl/Cmd + C
      if (e.key === 'c' && isCtrlOrCmd) {
        e.preventDefault();
        onCopy?.();
        return;
      }

      // Cut - Ctrl/Cmd + X
      if (e.key === 'x' && isCtrlOrCmd) {
        e.preventDefault();
        onCut?.();
        return;
      }

      // Paste - Ctrl/Cmd + V
      if (e.key === 'v' && isCtrlOrCmd) {
        e.preventDefault();
        onPaste?.();
        return;
      }

      // Select All - Ctrl/Cmd + A
      if (e.key === 'a' && isCtrlOrCmd) {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // Split - S or Ctrl/Cmd + Shift + S
      if (e.key === 's' && !isCtrlOrCmd) {
        e.preventDefault();
        onSplit?.();
        return;
      }

      // Zoom In - = or +
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        onZoomIn?.();
        return;
      }

      // Zoom Out - -
      if (e.key === '-') {
        e.preventDefault();
        onZoomOut?.();
        return;
      }

      // Zoom to Fit - 0
      if (e.key === '0' && isCtrlOrCmd) {
        e.preventDefault();
        onZoomFit?.();
        return;
      }

      // Frame Back - Left Arrow
      if (e.key === 'ArrowLeft' && !isCtrlOrCmd && !e.shiftKey) {
        e.preventDefault();
        onFrameBack?.();
        return;
      }

      // Frame Forward - Right Arrow
      if (e.key === 'ArrowRight' && !isCtrlOrCmd && !e.shiftKey) {
        e.preventDefault();
        onFrameForward?.();
        return;
      }

      // Go to Start - Home
      if (e.key === 'Home') {
        e.preventDefault();
        onGoToStart?.();
        return;
      }

      // Go to End - End
      if (e.key === 'End') {
        e.preventDefault();
        onGoToEnd?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onPlayPause,
    onStop,
    onUndo,
    onRedo,
    onDelete,
    onCopy,
    onCut,
    onPaste,
    onSelectAll,
    onSplit,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onFrameBack,
    onFrameForward,
    onGoToStart,
    onGoToEnd,
  ]);
}

export default useTimelineKeyboardShortcuts;
