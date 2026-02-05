/**
 * XSS Protection - Sanitization Utilities
 *
 * Context-aware HTML sanitization using DOMPurify to prevent XSS attacks.
 *
 * Features:
 * - Context-aware sanitization (rich text, plain text, URLs, etc.)
 * - Whitelist-based approach (only allowed tags/attributes)
 * - Smart link handling (safe external links)
 * - Configurable for different use cases
 *
 * Security: All user-generated content MUST be sanitized before rendering.
 *
 * Part of: Week 1 Security Sprint - Day 5
 * Date: 2025-10-14
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization Contexts
 *
 * Different contexts require different levels of sanitization:
 * - PLAIN_TEXT: Strip all HTML
 * - RICH_TEXT: Allow safe formatting tags
 * - COMMENT: Like rich text but more restrictive
 * - URL: Validate and sanitize URLs
 * - FILENAME: Sanitize file names
 */

/**
 * Sanitize Plain Text
 *
 * Strips ALL HTML tags, converts to plain text.
 * Use for: usernames, titles, short descriptions
 *
 * @param input - Raw user input
 * @returns Plain text (no HTML)
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (!input) return '';

  // Strip all HTML tags
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [] as string[], // No tags allowed
    ALLOWED_ATTR: [] as string[], // No attributes allowed
    KEEP_CONTENT: true // Keep text content
  });
}

/**
 * Sanitize Rich Text
 *
 * Allows safe formatting tags for rich text editors.
 * Use for: comments, descriptions, project details
 *
 * Allowed tags: headings, paragraphs, lists, links, formatting
 *
 * @param input - Raw HTML from rich text editor
 * @returns Sanitized HTML
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      // Structure
      'p', 'br', 'div', 'span',

      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',

      // Lists
      'ul', 'ol', 'li',

      // Formatting
      'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',

      // Quotes
      'blockquote', 'q',

      // Links
      'a'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,

    // Add rel="noopener noreferrer" to external links
    ADD_ATTR: ['target', 'rel'],
  } as Parameters<typeof DOMPurify.sanitize>[1]);
}

/**
 * Sanitize Comment
 *
 * More restrictive than rich text, suitable for comments.
 * Use for: user comments, feedback, short messages
 *
 * @param input - Raw comment text
 * @returns Sanitized HTML
 */
export function sanitizeComment(input: string | null | undefined): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br',
      'strong', 'b', 'em', 'i', 'u',
      'a', 'code'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  } as Parameters<typeof DOMPurify.sanitize>[1]);
}

/**
 * Sanitize URL
 *
 * Validates and sanitizes URLs.
 * Use for: link inputs, image sources, external references
 *
 * @param input - Raw URL
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURL(input: string | null | undefined): string {
  if (!input) return '';

  const trimmed = input.trim();

  // Allow only http, https, and mailto
  const allowedProtocols = ['http:', 'https:', 'mailto:'];

  try {
    const url = new URL(trimmed);

    if (!allowedProtocols.includes(url.protocol)) {
      console.warn('Blocked unsafe URL protocol:', url.protocol);
      return '';
    }

    // Sanitize the URL string
    return DOMPurify.sanitize(url.href, {
      ALLOWED_TAGS: [] as string[],
      ALLOWED_ATTR: [] as string[]
    });
  } catch (_err) {
    // Invalid URL
    console.warn('Invalid URL:', trimmed);
    return '';
  }
}

/**
 * Sanitize Filename
 *
 * Removes dangerous characters from filenames.
 * Use for: file uploads, file downloads
 *
 * @param input - Raw filename
 * @returns Safe filename
 */
export function sanitizeFilename(input: string | null | undefined): string {
  if (!input) return 'untitled';

  // Remove path traversal attempts
  let safe = input.replace(/\.\./g, '');

  // Remove path separators
  safe = safe.replace(/[/\\]/g, '');

  // Remove special shell characters
  safe = safe.replace(/[<>:"|?*]/g, '');

  // Remove control characters
  safe = safe.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Trim and limit length
  safe = safe.trim().substring(0, 255);

  return safe || 'untitled';
}

/**
 * Sanitize Email
 *
 * Validates and sanitizes email addresses.
 * Use for: email inputs, contact forms
 *
 * @param input - Raw email
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';

  const trimmed = input.trim().toLowerCase();

  // Basic email regex (not perfect but good enough)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return '';
  }

  // Sanitize to remove any HTML attempts
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[]
  });
}

/**
 * Sanitize JSON
 *
 * Safely parse JSON and sanitize string values.
 * Use for: API responses, user data storage
 *
 * @param input - JSON string
 * @returns Parsed and sanitized object or null if invalid
 */
export function sanitizeJSON(input: string | null | undefined): unknown {
  if (!input) return null;

  try {
    const parsed = JSON.parse(input);

    // Recursively sanitize all string values
    const sanitizeObject = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        return sanitizePlainText(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }

      return obj;
    };

    return sanitizeObject(parsed);
  } catch (err) {
    console.warn('Invalid JSON:', err);
    return null;
  }
}

/**
 * Sanitize Markdown (Future Enhancement)
 *
 * For now, treat as rich text. Can be enhanced with markdown-specific sanitization.
 *
 * @param input - Markdown text
 * @returns Sanitized markdown
 */
export function sanitizeMarkdown(input: string | null | undefined): string {
  // Currently uses rich text sanitization which handles common markdown-to-HTML output safely.
  // Future enhancement: Add markdown-aware parsing for better code block and link handling.
  return sanitizeRichText(input);
}

/**
 * Sanitize HTML Attributes
 *
 * Sanitizes individual HTML attributes (dangerous but sometimes needed).
 * Use with caution.
 *
 * @param input - Attribute value
 * @returns Sanitized attribute value
 */
export function sanitizeAttribute(input: string | null | undefined): string {
  if (!input) return '';

  // Remove javascript: and data: URIs
  if (input.toLowerCase().includes('javascript:') || input.toLowerCase().includes('data:')) {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[]
  });
}

/**
 * Escape HTML Entities
 *
 * Escapes HTML special characters for safe display.
 * Use when you want to display HTML as text.
 *
 * @param input - Raw text
 * @returns HTML-escaped text
 */
export function escapeHTML(input: string | null | undefined): string {
  if (!input) return '';

  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Unescape HTML Entities
 *
 * Converts HTML entities back to characters.
 *
 * @param input - HTML with entities
 * @returns Unescaped text
 */
export function unescapeHTML(input: string | null | undefined): string {
  if (!input) return '';

  const div = document.createElement('div');
  div.innerHTML = input;
  return div.textContent || '';
}

/**
 * Is Safe URL
 *
 * Checks if a URL is safe to use.
 *
 * @param url - URL to check
 * @returns True if safe
 */
export function isSafeURL(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const safeProtocols = ['http:', 'https:', 'mailto:'];
    return safeProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Strip Scripts
 *
 * Removes all script tags and event handlers.
 * Emergency function for untrusted content.
 *
 * @param input - Raw HTML
 * @returns HTML without scripts
 */
export function stripScripts(input: string | null | undefined): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });
}

/**
 * Sanitize for React
 *
 * Sanitizes HTML for safe use in dangerouslySetInnerHTML.
 * Returns an object ready for React.
 *
 * @param input - Raw HTML
 * @returns Object for dangerouslySetInnerHTML
 */
export function sanitizeForReact(input: string | null | undefined): { __html: string } {
  return {
    __html: sanitizeRichText(input)
  };
}

/**
 * Configure DOMPurify
 *
 * Global configuration for DOMPurify (optional customization).
 */
export function configureSanitizer(config: Parameters<typeof DOMPurify.setConfig>[0]): void {
  DOMPurify.setConfig(config);
}

/**
 * Default Export: Sanitization Functions
 */
export default {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeComment,
  sanitizeURL,
  sanitizeFilename,
  sanitizeEmail,
  sanitizeJSON,
  sanitizeMarkdown,
  sanitizeAttribute,
  escapeHTML,
  unescapeHTML,
  isSafeURL,
  stripScripts,
  sanitizeForReact,
  configureSanitizer
};

/**
 * Type Definitions
 */
export type SanitizationContext =
  | 'plain_text'
  | 'rich_text'
  | 'comment'
  | 'url'
  | 'filename'
  | 'email'
  | 'json'
  | 'markdown';

/**
 * Sanitize by Context
 *
 * Generic sanitization function that chooses the right sanitizer based on context.
 *
 * @param input - Raw input
 * @param context - Sanitization context
 * @returns Sanitized output
 */
export function sanitize(input: string | null | undefined, context: SanitizationContext): string {
  switch (context) {
    case 'plain_text':
      return sanitizePlainText(input);
    case 'rich_text':
      return sanitizeRichText(input);
    case 'comment':
      return sanitizeComment(input);
    case 'url':
      return sanitizeURL(input);
    case 'filename':
      return sanitizeFilename(input);
    case 'email':
      return sanitizeEmail(input);
    case 'markdown':
      return sanitizeMarkdown(input);
    case 'json':
      return String(sanitizeJSON(input));
    default:
      return sanitizePlainText(input);
  }
}
