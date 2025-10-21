/**
 * XSS Protection Test Suite
 *
 * Tests sanitization functions against common XSS attack vectors.
 *
 * Part of: Week 1 Security Sprint - Day 5
 * Date: 2025-10-14
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeComment,
  sanitizeURL,
  sanitizeFilename,
  sanitizeEmail,
  sanitizeJSON,
  sanitizeAttribute,
  escapeHTML,
  unescapeHTML,
  isSafeURL,
  stripScripts,
  sanitizeForReact
} from '../../src/lib/sanitize';

describe('XSS Protection - Plain Text Sanitization', () => {
  it('should strip all HTML tags', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizePlainText(input);
    expect(result).toBe('Hello World');
  });

  it('should block script tags', () => {
    const input = '<script>alert("XSS")</script>';
    const result = sanitizePlainText(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should block event handlers', () => {
    const input = '<img src=x onerror="alert(1)">';
    const result = sanitizePlainText(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('should handle null/undefined input', () => {
    expect(sanitizePlainText(null)).toBe('');
    expect(sanitizePlainText(undefined)).toBe('');
    expect(sanitizePlainText('')).toBe('');
  });

  it('should preserve text content', () => {
    const input = 'Hello World';
    const result = sanitizePlainText(input);
    expect(result).toBe('Hello World');
  });
});

describe('XSS Protection - Rich Text Sanitization', () => {
  it('should allow safe formatting tags', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeRichText(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
  });

  it('should block script tags', () => {
    const input = '<p>Hello</p><script>alert("XSS")</script>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should block event handlers', () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('onclick');
  });

  it('should sanitize links and add security attributes', () => {
    const input = '<a href="https://evil.com">Link</a>';
    const result = sanitizeRichText(input);
    expect(result).toContain('href');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('should block javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('javascript:');
  });

  it('should block data: URLs', () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('data:');
  });

  it('should allow safe internal links', () => {
    const input = '<a href="/dashboard">Dashboard</a>';
    const result = sanitizeRichText(input);
    expect(result).toContain('href="/dashboard"');
    expect(result).not.toContain('target="_blank"'); // Internal links don't need target
  });

  it('should strip style attributes', () => {
    const input = '<p style="color: red;">Text</p>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('style');
  });

  it('should block iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<iframe>');
  });
});

describe('XSS Protection - Comment Sanitization', () => {
  it('should allow basic formatting', () => {
    const input = 'Hello <strong>World</strong>!';
    const result = sanitizeComment(input);
    expect(result).toContain('<strong>');
  });

  it('should block headings', () => {
    const input = '<h1>Title</h1>';
    const result = sanitizeComment(input);
    expect(result).not.toContain('<h1>');
  });

  it('should block script tags', () => {
    const input = '<script>alert(1)</script>';
    const result = sanitizeComment(input);
    expect(result).not.toContain('<script>');
  });
});

describe('XSS Protection - URL Sanitization', () => {
  it('should allow https URLs', () => {
    const input = 'https://example.com';
    const result = sanitizeURL(input);
    expect(result).toBe('https://example.com/');
  });

  it('should allow http URLs', () => {
    const input = 'http://example.com';
    const result = sanitizeURL(input);
    expect(result).toBe('http://example.com/');
  });

  it('should block javascript: URLs', () => {
    const input = 'javascript:alert(1)';
    const result = sanitizeURL(input);
    expect(result).toBe('');
  });

  it('should block data: URLs', () => {
    const input = 'data:text/html,<script>alert(1)</script>';
    const result = sanitizeURL(input);
    expect(result).toBe('');
  });

  it('should block file: URLs', () => {
    const input = 'file:///etc/passwd';
    const result = sanitizeURL(input);
    expect(result).toBe('');
  });

  it('should handle malformed URLs', () => {
    const input = 'not a url';
    const result = sanitizeURL(input);
    expect(result).toBe('');
  });

  it('should allow mailto: URLs', () => {
    const input = 'mailto:test@example.com';
    const result = sanitizeURL(input);
    expect(result).toBe('mailto:test@example.com');
  });
});

describe('XSS Protection - Filename Sanitization', () => {
  it('should allow normal filenames', () => {
    const input = 'document.pdf';
    const result = sanitizeFilename(input);
    expect(result).toBe('document.pdf');
  });

  it('should block path traversal', () => {
    const input = '../../etc/passwd';
    const result = sanitizeFilename(input);
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
  });

  it('should block path separators', () => {
    const input = 'folder/file.txt';
    const result = sanitizeFilename(input);
    expect(result).not.toContain('/');
  });

  it('should block Windows path separators', () => {
    const input = 'folder\\file.txt';
    const result = sanitizeFilename(input);
    expect(result).not.toContain('\\');
  });

  it('should block special shell characters', () => {
    const input = 'file<>:|?.txt';
    const result = sanitizeFilename(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('|');
  });

  it('should limit filename length', () => {
    const input = 'a'.repeat(300);
    const result = sanitizeFilename(input);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  it('should return default for empty filename', () => {
    expect(sanitizeFilename('')).toBe('untitled');
    expect(sanitizeFilename(null)).toBe('untitled');
  });
});

describe('XSS Protection - Email Sanitization', () => {
  it('should allow valid emails', () => {
    const input = 'user@example.com';
    const result = sanitizeEmail(input);
    expect(result).toBe('user@example.com');
  });

  it('should lowercase emails', () => {
    const input = 'User@EXAMPLE.COM';
    const result = sanitizeEmail(input);
    expect(result).toBe('user@example.com');
  });

  it('should reject invalid emails', () => {
    expect(sanitizeEmail('notanemail')).toBe('');
    expect(sanitizeEmail('no@domain')).toBe('');
    expect(sanitizeEmail('@example.com')).toBe('');
  });

  it('should strip HTML from emails', () => {
    const input = '<script>alert(1)</script>@example.com';
    const result = sanitizeEmail(input);
    expect(result).not.toContain('<script>');
  });
});

describe('XSS Protection - JSON Sanitization', () => {
  it('should parse and sanitize valid JSON', () => {
    const input = '{"name": "<script>alert(1)</script>"}';
    const result = sanitizeJSON(input);
    expect(result).toBeDefined();
    expect((result as any).name).not.toContain('<script>');
  });

  it('should handle nested objects', () => {
    const input = '{"user": {"name": "<b>John</b>"}}';
    const result = sanitizeJSON(input);
    expect((result as any).user.name).not.toContain('<b>');
  });

  it('should handle arrays', () => {
    const input = '["<script>alert(1)</script>", "safe"]';
    const result = sanitizeJSON(input) as any;
    expect(result[0]).not.toContain('<script>');
    expect(result[1]).toBe('safe');
  });

  it('should return null for invalid JSON', () => {
    const input = '{invalid json}';
    const result = sanitizeJSON(input);
    expect(result).toBeNull();
  });
});

describe('XSS Protection - Attribute Sanitization', () => {
  it('should strip HTML from attributes', () => {
    const input = '<script>alert(1)</script>';
    const result = sanitizeAttribute(input);
    expect(result).not.toContain('<script>');
  });

  it('should block javascript: URLs', () => {
    const input = 'javascript:alert(1)';
    const result = sanitizeAttribute(input);
    expect(result).toBe('');
  });

  it('should block data: URLs', () => {
    const input = 'data:text/html,<script>alert(1)</script>';
    const result = sanitizeAttribute(input);
    expect(result).toBe('');
  });
});

describe('XSS Protection - HTML Escaping', () => {
  it('should escape HTML special characters', () => {
    const input = '<div>Hello & "World"</div>';
    const result = escapeHTML(input);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
  });

  it('should round-trip with unescapeHTML', () => {
    const input = '<div>Hello & "World"</div>';
    const escaped = escapeHTML(input);
    const unescaped = unescapeHTML(escaped);
    expect(unescaped).toBe(input);
  });
});

describe('XSS Protection - URL Safety Check', () => {
  it('should identify safe URLs', () => {
    expect(isSafeURL('https://example.com')).toBe(true);
    expect(isSafeURL('http://example.com')).toBe(true);
    expect(isSafeURL('mailto:test@example.com')).toBe(true);
  });

  it('should identify unsafe URLs', () => {
    expect(isSafeURL('javascript:alert(1)')).toBe(false);
    expect(isSafeURL('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeURL('file:///etc/passwd')).toBe(false);
  });

  it('should handle invalid URLs', () => {
    expect(isSafeURL('not a url')).toBe(false);
    expect(isSafeURL('')).toBe(false);
    expect(isSafeURL(null)).toBe(false);
  });
});

describe('XSS Protection - Script Stripping', () => {
  it('should remove script tags', () => {
    const input = '<p>Hello</p><script>alert(1)</script>';
    const result = stripScripts(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>');
  });

  it('should remove event handlers', () => {
    const input = '<p onclick="alert(1)">Click</p>';
    const result = stripScripts(input);
    expect(result).not.toContain('onclick');
  });

  it('should remove iframes', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = stripScripts(input);
    expect(result).not.toContain('<iframe>');
  });
});

describe('XSS Protection - React Integration', () => {
  it('should return object for dangerouslySetInnerHTML', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeForReact(input);
    expect(result).toHaveProperty('__html');
    expect(result.__html).toContain('<p>');
    expect(result.__html).toContain('<strong>');
  });

  it('should sanitize dangerous content', () => {
    const input = '<script>alert(1)</script>';
    const result = sanitizeForReact(input);
    expect(result.__html).not.toContain('<script>');
  });
});

describe('XSS Protection - Advanced Attack Vectors', () => {
  it('should block svg-based XSS', () => {
    const input = '<svg onload="alert(1)"><circle r="50"/></svg>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('onload');
  });

  it('should block base64-encoded scripts', () => {
    const input = '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('data:');
  });

  it('should block nested scripts', () => {
    const input = '<div><p><span><script>alert(1)</script></span></p></div>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('<script>');
  });

  it('should block unicode obfuscation', () => {
    const input = '<a href="&#106;avascript:alert(1)">Click</a>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('javascript:');
  });

  it('should block HTML entity obfuscation', () => {
    const input = '<a href="&amp;#106;avascript:alert(1)">Click</a>';
    const result = sanitizeRichText(input);
    expect(result).not.toContain('javascript:');
  });
});
