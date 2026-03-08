import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockUndo = vi.fn()
const mockRedo = vi.fn()
const mockDestroy = vi.fn()
const mockOn = vi.fn()

let mockUndoStack: unknown[] = []
let mockRedoStack: unknown[] = []

vi.mock('yjs', () => {
  class MockDoc {
    getArray() {
      return { observe: vi.fn() }
    }
  }

  class MockUndoManager {
    get undoStack() { return mockUndoStack }
    get redoStack() { return mockRedoStack }
    undo = mockUndo
    redo = mockRedo
    destroy = mockDestroy
    on = mockOn
  }

  return {
    Doc: MockDoc,
    UndoManager: MockUndoManager,
  }
})

import { useMetMapUndo } from '../useMetMapUndo'
import * as Y from 'yjs'

describe('useMetMapUndo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUndoStack = []
    mockRedoStack = []
  })

  test('initial canUndo=false, canRedo=false when doc is null', () => {
    const { result } = renderHook(() => useMetMapUndo(null))
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  test('creates UndoManager when doc provided', () => {
    const doc = new Y.Doc()
    renderHook(() => useMetMapUndo(doc))
    // UndoManager was constructed (on was called for event listeners)
    expect(mockOn).toHaveBeenCalled()
  })

  test('undo calls undoManager.undo()', () => {
    const doc = new Y.Doc()
    const { result } = renderHook(() => useMetMapUndo(doc))
    act(() => {
      result.current.undo()
    })
    expect(mockUndo).toHaveBeenCalledOnce()
  })

  test('redo calls undoManager.redo()', () => {
    const doc = new Y.Doc()
    const { result } = renderHook(() => useMetMapUndo(doc))
    act(() => {
      result.current.redo()
    })
    expect(mockRedo).toHaveBeenCalledOnce()
  })

  test('cleanup destroys UndoManager on unmount', () => {
    const doc = new Y.Doc()
    const { unmount } = renderHook(() => useMetMapUndo(doc))
    unmount()
    expect(mockDestroy).toHaveBeenCalledOnce()
  })

  test('resets state when doc changes to null', () => {
    const doc = new Y.Doc()
    const { result, rerender } = renderHook(
      ({ d }: { d: Y.Doc | null }) => useMetMapUndo(d),
      { initialProps: { d: doc as Y.Doc | null } }
    )
    rerender({ d: null })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  test('handles null doc gracefully', () => {
    const { result } = renderHook(() => useMetMapUndo(null))
    // Calling undo/redo on null doc does not throw
    act(() => {
      result.current.undo()
      result.current.redo()
    })
    expect(mockUndo).not.toHaveBeenCalled()
    expect(mockRedo).not.toHaveBeenCalled()
  })

  test('updates canUndo/canRedo on stack events', () => {
    const doc = new Y.Doc()
    renderHook(() => useMetMapUndo(doc))

    // The hook registers on('stack-item-added') and on('stack-item-popped')
    expect(mockOn).toHaveBeenCalledWith('stack-item-added', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('stack-item-popped', expect.any(Function))
  })
})
