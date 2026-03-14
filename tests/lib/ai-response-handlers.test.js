/**
 * Unit Tests for lib/ai/response-handlers.js
 * Tests extractTextContent, extractThinkingContent, and extractJSON.
 */

const {
  extractTextContent,
  extractThinkingContent,
  extractJSON,
} = require('../../lib/ai/response-handlers');

describe('lib/ai/response-handlers', () => {
  // =========================================================================
  // extractTextContent
  // =========================================================================
  describe('extractTextContent', () => {
    it('should extract text from a simple response', () => {
      const response = {
        content: [{ type: 'text', text: 'Hello world' }],
      };
      expect(extractTextContent(response)).toBe('Hello world');
    });

    it('should concatenate multiple text blocks', () => {
      const response = {
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: ' Part 2' },
        ],
      };
      expect(extractTextContent(response)).toBe('Part 1 Part 2');
    });

    it('should filter out thinking blocks', () => {
      const response = {
        content: [
          { type: 'thinking', thinking: 'Let me analyze...' },
          { type: 'text', text: 'Here is the answer.' },
        ],
      };
      expect(extractTextContent(response)).toBe('Here is the answer.');
    });

    it('should filter out tool_use blocks', () => {
      const response = {
        content: [
          { type: 'tool_use', id: 'tool_1', name: 'search', input: {} },
          { type: 'text', text: 'Found results.' },
        ],
      };
      expect(extractTextContent(response)).toBe('Found results.');
    });

    it('should handle mixed thinking and text blocks', () => {
      const response = {
        content: [
          { type: 'thinking', thinking: 'Step 1: analyze...' },
          { type: 'text', text: 'First part. ' },
          { type: 'thinking', thinking: 'Step 2: synthesize...' },
          { type: 'text', text: 'Second part.' },
        ],
      };
      expect(extractTextContent(response)).toBe('First part. Second part.');
    });

    it('should return empty string for null/undefined response', () => {
      expect(extractTextContent(null)).toBe('');
      expect(extractTextContent(undefined)).toBe('');
      expect(extractTextContent({})).toBe('');
    });

    it('should return empty string when no text blocks exist', () => {
      const response = {
        content: [{ type: 'thinking', thinking: 'Just thinking...' }],
      };
      expect(extractTextContent(response)).toBe('');
    });
  });

  // =========================================================================
  // extractThinkingContent
  // =========================================================================
  describe('extractThinkingContent', () => {
    it('should extract thinking blocks', () => {
      const response = {
        content: [
          { type: 'thinking', thinking: 'Let me think...' },
          { type: 'text', text: 'Answer' },
        ],
      };
      expect(extractThinkingContent(response)).toBe('Let me think...');
    });

    it('should concatenate multiple thinking blocks', () => {
      const response = {
        content: [
          { type: 'thinking', thinking: 'Step 1. ' },
          { type: 'thinking', thinking: 'Step 2.' },
          { type: 'text', text: 'Done' },
        ],
      };
      expect(extractThinkingContent(response)).toBe('Step 1. Step 2.');
    });

    it('should return empty string when no thinking blocks exist', () => {
      const response = {
        content: [{ type: 'text', text: 'Just text' }],
      };
      expect(extractThinkingContent(response)).toBe('');
    });

    it('should return empty string for null response', () => {
      expect(extractThinkingContent(null)).toBe('');
    });
  });

  // =========================================================================
  // extractJSON
  // =========================================================================
  describe('extractJSON', () => {
    it('should parse pure JSON string', () => {
      const result = extractJSON('{"name": "test", "value": 42}');
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should parse JSON array', () => {
      const result = extractJSON('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should extract JSON embedded in text', () => {
      const text = 'Here is the result:\n{"name": "test"}\nHope that helps!';
      expect(extractJSON(text)).toEqual({ name: 'test' });
    });

    it('should extract JSON from markdown code blocks', () => {
      const text = '```json\n{"key": "value"}\n```';
      expect(extractJSON(text)).toEqual({ key: 'value' });
    });

    it('should return null for non-JSON text', () => {
      expect(extractJSON('Just some plain text')).toBeNull();
    });

    it('should return null for empty/null input', () => {
      expect(extractJSON(null)).toBeNull();
      expect(extractJSON('')).toBeNull();
      expect(extractJSON(undefined)).toBeNull();
    });

    it('should handle nested JSON objects', () => {
      const text = '{"outer": {"inner": [1, 2, 3]}}';
      const result = extractJSON(text);
      expect(result.outer.inner).toEqual([1, 2, 3]);
    });
  });
});
