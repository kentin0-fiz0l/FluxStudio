import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: (endpoint: string) => `http://localhost:3001${endpoint}`,
}))

import {
  streamSongAnalysis,
  streamChordSuggestions,
  streamPracticeInsights,
  parseChordGridsFromResponse,
} from '../metmapAIService'

describe('metmapAIService', () => {
  const mockCallbacks = {
    onChunk: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          cancel: vi.fn(),
          releaseLock: vi.fn(),
        }),
      },
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('streamSongAnalysis', () => {
    test('calls fetch with correct URL and headers', () => {
      streamSongAnalysis('song-1', 'my-token', 'structure', mockCallbacks)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/metmap/analyze-song',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer my-token',
            'Content-Type': 'application/json',
          },
        })
      )
    })

    test('passes songId and focus in body', () => {
      streamSongAnalysis('song-1', 'token', 'harmony', mockCallbacks)

      const callArgs = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]!.body as string)
      expect(body.songId).toBe('song-1')
      expect(body.focus).toBe('harmony')
    })

    test('returns AbortController', () => {
      const controller = streamSongAnalysis('song-1', 'token', 'all', mockCallbacks)
      expect(controller).toBeInstanceOf(AbortController)
    })
  })

  describe('streamChordSuggestions', () => {
    test('includes sectionId in body', () => {
      streamChordSuggestions('song-1', 'section-2', 'token', { style: 'jazz' }, mockCallbacks)

      const callArgs = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]!.body as string)
      expect(body.songId).toBe('song-1')
      expect(body.sectionId).toBe('section-2')
      expect(body.style).toBe('jazz')
    })
  })

  describe('streamPracticeInsights', () => {
    test('calls correct endpoint', () => {
      streamPracticeInsights('song-1', 'token', mockCallbacks)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/metmap/practice-insights',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('parseChordGridsFromResponse', () => {
    test('parses simple chord grid', () => {
      const text = `Here's a progression:
| Cmaj7 . . . | Am7 . . . |
| Dm7 . . . | G7 . . . |`

      const grids = parseChordGridsFromResponse(text)
      expect(grids.length).toBeGreaterThan(0)
      expect(grids[0].chords.length).toBeGreaterThan(0)
      expect(grids[0].chords[0].symbol).toBe('Cmaj7')
    })

    test('returns empty for no grids', () => {
      const text = 'Just some regular text without any chord grids.'
      const grids = parseChordGridsFromResponse(text)
      expect(grids).toEqual([])
    })

    test('extracts option labels', () => {
      const text = `**Option 1: Jazz variation**
| Cmaj7 . . . | Am7 . . . |

**Option 2: Pop variation**
| C . . . | Am . . . |`

      const grids = parseChordGridsFromResponse(text)
      expect(grids.length).toBe(2)
      expect(grids[0].label).toBe('Option 1: Jazz variation')
      expect(grids[1].label).toBe('Option 2: Pop variation')
    })
  })
})
