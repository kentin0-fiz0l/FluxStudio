import { describe, test, expect, vi, beforeEach } from 'vitest'
import { generateBeatMarkers, snapToBeat } from '../audioAnalysis'

describe('audioAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateBeatMarkers', () => {
    test('returns empty array for bpm<=0', () => {
      expect(generateBeatMarkers(0, 10000)).toEqual([])
      expect(generateBeatMarkers(-120, 10000)).toEqual([])
    })

    test('returns empty array for duration<=0', () => {
      expect(generateBeatMarkers(120, 0)).toEqual([])
      expect(generateBeatMarkers(120, -5000)).toEqual([])
    })

    test('correct number of beats at 120bpm for 10000ms', () => {
      // 120 bpm = 500ms per beat, 10000ms / 500ms = 20 beats
      const markers = generateBeatMarkers(120, 10000)
      expect(markers.length).toBe(20)
    })

    test('beat numbering starts at 1', () => {
      const markers = generateBeatMarkers(120, 2000)
      expect(markers[0].beat).toBe(1)
      expect(markers[1].beat).toBe(2)
    })

    test('measure numbering increments every beatsPerMeasure', () => {
      const markers = generateBeatMarkers(120, 5000, 4)
      // Beat 1-4 = measure 1, beat 5-8 = measure 2
      expect(markers[0].measure).toBe(1)
      expect(markers[3].measure).toBe(1)
      expect(markers[4].measure).toBe(2)
    })

    test('beatInMeasure cycles 1-4 for 4/4 time', () => {
      const markers = generateBeatMarkers(120, 5000, 4)
      expect(markers[0].beatInMeasure).toBe(1)
      expect(markers[1].beatInMeasure).toBe(2)
      expect(markers[2].beatInMeasure).toBe(3)
      expect(markers[3].beatInMeasure).toBe(4)
      expect(markers[4].beatInMeasure).toBe(1)
    })

    test('respects offset parameter', () => {
      const markers = generateBeatMarkers(120, 5000, 4, 100)
      expect(markers[0].time).toBe(100)
      expect(markers[1].time).toBe(600) // 100 + 500
    })

    test('handles 3 beatsPerMeasure (3/4 time)', () => {
      const markers = generateBeatMarkers(120, 5000, 3)
      expect(markers[0].beatInMeasure).toBe(1)
      expect(markers[1].beatInMeasure).toBe(2)
      expect(markers[2].beatInMeasure).toBe(3)
      expect(markers[3].beatInMeasure).toBe(1) // Next measure
      expect(markers[2].measure).toBe(1)
      expect(markers[3].measure).toBe(2)
    })
  })

  describe('snapToBeat', () => {
    test('returns same time for bpm<=0', () => {
      expect(snapToBeat(1234, 0)).toBe(1234)
      expect(snapToBeat(1234, -10)).toBe(1234)
    })

    test('snaps to nearest beat', () => {
      // 120bpm = 500ms intervals
      // 1230ms should snap to 1000ms (beat 2) or 1500ms (beat 3)
      // 1230 is closer to 1000 (230ms) than 1500 (270ms)
      const snapped = snapToBeat(1230, 120)
      expect(snapped).toBe(1000)
    })

    test('snaps to exact beat position', () => {
      // Exactly on a beat at 120bpm
      const snapped = snapToBeat(1000, 120)
      expect(snapped).toBe(1000)
    })

    test('respects offset', () => {
      // 120bpm, offset 200ms: beats at 200, 700, 1200, 1700...
      // 650ms should snap to 700 (offset 200 + 500)
      const snapped = snapToBeat(650, 120, 200)
      expect(snapped).toBe(700)
    })
  })
})
