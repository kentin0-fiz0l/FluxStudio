/**
 * Unit Tests for Presentation AI Service
 * @file src/services/__tests__/presentationAIService.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  streamPresentationNotes,
  generateLocalPresentationNotes,
} from '../presentationAIService';
vi.mock('../../config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001/api${path}`,
}));

describe('presentationAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateLocalPresentationNotes', () => {
    it('should generate notes from set metadata', () => {
      const sets = [
        { name: 'Opener', counts: 16 },
        { name: 'Ballad', counts: 32 },
        { name: 'Closer', counts: 24 },
      ];

      const notes = generateLocalPresentationNotes(sets);

      expect(notes).toHaveLength(3);
      expect(notes[0].setIndex).toBe(0);
      expect(notes[0].setName).toBe('Opener');
      expect(notes[0].content).toContain('Opener');
      expect(notes[0].content).toContain('16 counts');
      expect(notes[0].content).toContain('Opening formation');
    });

    it('should use existing notes if provided', () => {
      const sets = [
        { name: 'Set 1', counts: 8, notes: 'Custom narration for this set.' },
      ];

      const notes = generateLocalPresentationNotes(sets);
      expect(notes[0].content).toBe('Custom narration for this set.');
    });

    it('should generate appropriate descriptions for different set types', () => {
      const sets = [
        { name: 'Opener March', counts: 16 },
        { name: 'Ballad Section', counts: 32 },
        { name: 'Grand Finale', counts: 24 },
        { name: 'Drill Block', counts: 8 },
        { name: 'Movement A', counts: 12 },
      ];

      const notes = generateLocalPresentationNotes(sets);

      expect(notes[0].content).toContain('Opening formation');
      expect(notes[1].content).toContain('Flowing movement');
      expect(notes[2].content).toContain('Dynamic closer');
      expect(notes[3].content).toContain('Precision movement');
      expect(notes[4].content).toContain('Transition');
    });

    it('should return empty array for no sets', () => {
      expect(generateLocalPresentationNotes([])).toEqual([]);
    });
  });

  describe('streamPresentationNotes', () => {
    it('should call fetch with correct URL and auth header', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      }));

      const callbacks = { onNote: vi.fn(), onDone: vi.fn(), onError: vi.fn() };
      const params = {
        formationId: 'f1',
        formationName: 'Test',
        performers: [],
        sets: [],
      };

      streamPresentationNotes(params, 'test-token', callbacks);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/presentation/notes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should return an AbortController', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({ start(c) { c.close(); } }),
      }));

      const controller = streamPresentationNotes(
        { formationId: 'f1', formationName: 'Test', performers: [], sets: [] },
        'token',
        { onNote: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
      );

      expect(controller).toBeInstanceOf(AbortController);
      controller.abort();
    });

    it('should invoke onNote for note SSE events', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"note","data":{"setIndex":0,"setName":"Set 1","content":"Test note"}}\n'),
          );
          controller.enqueue(encoder.encode('data: {"type":"done"}\n'));
          controller.close();
        },
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

      const onNote = vi.fn();
      const onDone = vi.fn();

      streamPresentationNotes(
        { formationId: 'f1', formationName: 'Test', performers: [], sets: [] },
        'token',
        { onNote, onDone, onError: vi.fn() },
      );

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 100));

      expect(onNote).toHaveBeenCalledWith({
        setIndex: 0,
        setName: 'Set 1',
        content: 'Test note',
      });
      expect(onDone).toHaveBeenCalled();
    });

    it('should invoke onError on non-OK response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }));

      const onError = vi.fn();
      streamPresentationNotes(
        { formationId: 'f1', formationName: 'Test', performers: [], sets: [] },
        'token',
        { onNote: vi.fn(), onDone: vi.fn(), onError },
      );

      await new Promise((r) => setTimeout(r, 100));
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should invoke onError on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
        new TypeError('Failed to fetch'),
      ));

      const onError = vi.fn();
      streamPresentationNotes(
        { formationId: 'f1', formationName: 'Test', performers: [], sets: [] },
        'token',
        { onNote: vi.fn(), onDone: vi.fn(), onError },
      );

      await new Promise((r) => setTimeout(r, 100));
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('internet connection') }),
      );
    });
  });
});
