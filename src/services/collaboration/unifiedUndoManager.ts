/**
 * UnifiedUndoManager - Coordinates undo/redo across MetMap and Drill Writer.
 *
 * Maintains a timestamp-interleaved undo stack so that a single Ctrl+Z
 * undoes the most recent action from either Y.UndoManager.
 */

import * as Y from 'yjs';

type UndoSource = 'formation' | 'metmap';

interface StackEntry {
  source: UndoSource;
  timestamp: number;
}

type StackChangedHandler = () => void;

/**
 * Coordinates two Y.UndoManager instances for unified undo/redo.
 *
 * @example
 * ```ts
 * const unified = new UnifiedUndoManager(formationUndoMgr, metmapUndoMgr);
 * unified.undo(); // undoes the most recent action from either manager
 * unified.redo(); // redoes in correct order
 * ```
 */
export class UnifiedUndoManager {
  private formationMgr: Y.UndoManager;
  private metmapMgr: Y.UndoManager;
  private undoStack: StackEntry[] = [];
  private redoStack: StackEntry[] = [];
  private handlers = new Set<StackChangedHandler>();
  private destroyed = false;

  private formationStackAddedHandler: () => void;
  private metmapStackAddedHandler: () => void;

  constructor(formationMgr: Y.UndoManager, metmapMgr: Y.UndoManager) {
    this.formationMgr = formationMgr;
    this.metmapMgr = metmapMgr;

    // Track when either manager adds to its undo stack
    this.formationStackAddedHandler = () => {
      if (!this.destroyed) {
        this.undoStack.push({ source: 'formation', timestamp: Date.now() });
        this.redoStack = [];
        this.emitStackChanged();
      }
    };

    this.metmapStackAddedHandler = () => {
      if (!this.destroyed) {
        this.undoStack.push({ source: 'metmap', timestamp: Date.now() });
        this.redoStack = [];
        this.emitStackChanged();
      }
    };

    formationMgr.on('stack-item-added', this.formationStackAddedHandler);
    metmapMgr.on('stack-item-added', this.metmapStackAddedHandler);
  }

  /**
   * Undo the most recent action from either manager.
   */
  undo(): void {
    if (this.undoStack.length === 0) return;

    const entry = this.undoStack.pop()!;
    const mgr = entry.source === 'formation' ? this.formationMgr : this.metmapMgr;

    if (mgr.undoStack.length > 0) {
      // Temporarily remove our listener to avoid double-tracking
      mgr.off('stack-item-added', entry.source === 'formation'
        ? this.formationStackAddedHandler
        : this.metmapStackAddedHandler);

      mgr.undo();

      mgr.on('stack-item-added', entry.source === 'formation'
        ? this.formationStackAddedHandler
        : this.metmapStackAddedHandler);

      this.redoStack.push(entry);
    }

    this.emitStackChanged();
  }

  /**
   * Redo the most recently undone action in correct order.
   */
  redo(): void {
    if (this.redoStack.length === 0) return;

    const entry = this.redoStack.pop()!;
    const mgr = entry.source === 'formation' ? this.formationMgr : this.metmapMgr;

    if (mgr.redoStack.length > 0) {
      // Temporarily remove our listener to avoid double-tracking
      mgr.off('stack-item-added', entry.source === 'formation'
        ? this.formationStackAddedHandler
        : this.metmapStackAddedHandler);

      mgr.redo();

      mgr.on('stack-item-added', entry.source === 'formation'
        ? this.formationStackAddedHandler
        : this.metmapStackAddedHandler);

      this.undoStack.push(entry);
    }

    this.emitStackChanged();
  }

  /** Whether undo is available */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Whether redo is available */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Subscribe to stack-changed events.
   * @returns Unsubscribe function
   */
  on(event: 'stack-changed', handler: StackChangedHandler): () => void {
    if (event !== 'stack-changed') return () => {};
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Clean up all listeners.
   */
  destroy(): void {
    this.destroyed = true;
    this.formationMgr.off('stack-item-added', this.formationStackAddedHandler);
    this.metmapMgr.off('stack-item-added', this.metmapStackAddedHandler);
    this.handlers.clear();
    this.undoStack = [];
    this.redoStack = [];
  }

  private emitStackChanged(): void {
    this.handlers.forEach((h) => {
      try {
        h();
      } catch (err) {
        console.error('[UnifiedUndoManager] Error in stack-changed handler:', err);
      }
    });
  }
}
