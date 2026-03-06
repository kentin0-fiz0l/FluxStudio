import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMetMapHistory } from '../useMetMapHistory'

describe('useMetMapHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('initial canUndo is false', () => {
    const { result } = renderHook(() => useMetMapHistory())
    expect(result.current.canUndo).toBe(false)
  })

  test('initial canRedo is false', () => {
    const { result } = renderHook(() => useMetMapHistory())
    expect(result.current.canRedo).toBe(false)
  })

  test('saveSnapshot makes canUndo true', () => {
    const { result } = renderHook(() => useMetMapHistory())
    act(() => {
      result.current.saveSnapshot([{ id: 's1' }] as never[])
    })
    expect(result.current.canUndo).toBe(true)
  })

  test('undo returns previous snapshot', () => {
    const { result } = renderHook(() => useMetMapHistory())
    const snapshot = [{ id: 's1', name: 'Intro' }] as never[]
    const current = [{ id: 's1', name: 'Intro Modified' }] as never[]

    act(() => {
      result.current.saveSnapshot(snapshot)
    })

    let restored: unknown
    act(() => {
      restored = result.current.undo(current)
    })
    expect(restored).toEqual(snapshot)
  })

  test('undo when empty returns null', () => {
    const { result } = renderHook(() => useMetMapHistory())
    let restored: unknown
    act(() => {
      restored = result.current.undo([])
    })
    expect(restored).toBeNull()
  })

  test('redo returns next snapshot', () => {
    const { result } = renderHook(() => useMetMapHistory())
    const original = [{ id: 's1', name: 'Original' }] as never[]
    const modified = [{ id: 's1', name: 'Modified' }] as never[]

    act(() => {
      result.current.saveSnapshot(original)
    })

    // Undo to get something in the redo stack
    act(() => {
      result.current.undo(modified)
    })

    let redone: unknown
    act(() => {
      redone = result.current.redo(original)
    })
    expect(redone).toEqual(modified)
  })

  test('redo when empty returns null', () => {
    const { result } = renderHook(() => useMetMapHistory())
    let restored: unknown
    act(() => {
      restored = result.current.redo([])
    })
    expect(restored).toBeNull()
  })

  test('new saveSnapshot clears redo stack (canRedo becomes false)', () => {
    const { result } = renderHook(() => useMetMapHistory())

    act(() => {
      result.current.saveSnapshot([{ id: '1' }] as never[])
    })
    act(() => {
      result.current.undo([{ id: '2' }] as never[])
    })
    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.saveSnapshot([{ id: '3' }] as never[])
    })
    expect(result.current.canRedo).toBe(false)
  })

  test('history caps at MAX_HISTORY (50) entries', () => {
    const { result } = renderHook(() => useMetMapHistory())

    // Push 55 snapshots
    for (let i = 0; i < 55; i++) {
      act(() => {
        result.current.saveSnapshot([{ id: `s${i}` }] as never[])
      })
    }

    // Undo 50 times should work, 51st should return null
    let undoneCount = 0
    for (let i = 0; i < 55; i++) {
      let val: unknown
      act(() => {
        val = result.current.undo([{ id: 'current' }] as never[])
      })
      if (val !== null) undoneCount++
      else break
    }
    expect(undoneCount).toBe(50)
  })

  test('after undo, canRedo becomes true', () => {
    const { result } = renderHook(() => useMetMapHistory())

    act(() => {
      result.current.saveSnapshot([{ id: 's1' }] as never[])
    })
    expect(result.current.canRedo).toBe(false)

    act(() => {
      result.current.undo([{ id: 's2' }] as never[])
    })
    expect(result.current.canRedo).toBe(true)
  })
})
