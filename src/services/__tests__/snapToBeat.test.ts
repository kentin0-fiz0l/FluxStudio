import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../../contexts/metmap/types', () => ({
  secondsToGlobalBeat: vi.fn().mockReturnValue(0),
  getBeatsPerBar: vi.fn().mockReturnValue(4),
}))

import { nearestBeat, snapToNearestBeat } from '../snapToBeat'
import { secondsToGlobalBeat } from '../../contexts/metmap/types'
import type { BeatMap, Section } from '../../contexts/metmap/types'

function makeBeatMap(beats: number[]): BeatMap {
  return { beats } as BeatMap
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 's1',
    name: 'Intro',
    bars: 4,
    timeSignature: '4/4',
    bpm: 120,
    ...overrides,
  } as Section
}

describe('snapToBeat service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(secondsToGlobalBeat).mockReturnValue(0)
  })

  describe('nearestBeat', () => {
    test('finds closest beat within threshold', () => {
      const beatMap = makeBeatMap([1.0, 2.0, 3.0])
      const result = nearestBeat(2.03, beatMap, 50) // 30ms away from 2.0
      expect(result).toBe(2.0)
    })

    test('returns null when no beats within threshold', () => {
      const beatMap = makeBeatMap([1.0, 2.0, 3.0])
      const result = nearestBeat(1.5, beatMap, 10) // 500ms away from any beat
      expect(result).toBeNull()
    })

    test('returns null for empty beat array', () => {
      const beatMap = makeBeatMap([])
      const result = nearestBeat(1.0, beatMap, 50)
      expect(result).toBeNull()
    })

    test('exact match returns that beat', () => {
      const beatMap = makeBeatMap([1.0, 2.0, 3.0])
      const result = nearestBeat(2.0, beatMap, 50)
      expect(result).toBe(2.0)
    })
  })

  describe('snapToNearestBeat', () => {
    test('uses detected beats first', () => {
      const sections = [makeSection()]
      const beatMap = makeBeatMap([1.0, 2.0, 3.0])
      vi.mocked(secondsToGlobalBeat).mockReturnValue(4)

      const result = snapToNearestBeat(2.01, sections, beatMap, 50)
      expect(result.time).toBe(2.0)
      expect(result.snapType).toBe('beat')
      expect(result.didSnap).toBe(true)
    })

    test('falls back to grid when no detected beats nearby', () => {
      const sections = [makeSection()]
      const beatMap = makeBeatMap([1.0, 3.0]) // No beat near 2.0
      vi.mocked(secondsToGlobalBeat).mockReturnValue(4)

      const result = snapToNearestBeat(2.0, sections, beatMap, 10) // 10ms threshold
      expect(result.snapType).toBe('grid')
      expect(result.didSnap).toBe(false)
    })

    test('falls back to grid when beatMap is null', () => {
      const sections = [makeSection()]
      vi.mocked(secondsToGlobalBeat).mockReturnValue(0)

      const result = snapToNearestBeat(1.5, sections, null, 50)
      expect(result.snapType).toBe('grid')
      expect(result.didSnap).toBe(false)
    })

    test('didSnap is true when beat found', () => {
      const sections = [makeSection()]
      const beatMap = makeBeatMap([1.0, 2.0])
      vi.mocked(secondsToGlobalBeat).mockReturnValue(2)

      const result = snapToNearestBeat(1.01, sections, beatMap, 50)
      expect(result.didSnap).toBe(true)
    })

    test('didSnap is false on grid fallback', () => {
      const sections = [makeSection()]
      vi.mocked(secondsToGlobalBeat).mockReturnValue(0)

      const result = snapToNearestBeat(1.5, sections, null, 50)
      expect(result.didSnap).toBe(false)
    })

    test('snapType is "beat" or "grid"', () => {
      const sections = [makeSection()]
      const beatMap = makeBeatMap([1.0])
      vi.mocked(secondsToGlobalBeat).mockReturnValue(0)

      const beatResult = snapToNearestBeat(1.01, sections, beatMap, 50)
      expect(beatResult.snapType).toBe('beat')

      const gridResult = snapToNearestBeat(5.0, sections, null, 50)
      expect(gridResult.snapType).toBe('grid')
    })
  })
})
