/**
 * MarkdownMessage Component
 * Renders message text with lightweight Markdown formatting.
 *
 * Supported formats:
 * - **bold**
 * - *italic*
 * - `inline code`
 * - [link text](url)
 * - Bullet lists (- item)
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface MarkdownMessageProps {
  text: string;
  className?: string;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Parse and render markdown to React elements
function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let key = 0;

  // Split by lines for list handling
  const lines = text.split('\n');
  let inList = false;
  let listItems: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for list item
    if (line.match(/^[-*]\s+/)) {
      const itemText = line.replace(/^[-*]\s+/, '');
      listItems.push(
        <li key={`li-${key++}`} className="ml-4">
          {parseInlineMarkdown(itemText)}
        </li>
      );
      inList = true;
    } else {
      // If we were in a list, close it
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`ul-${key++}`} className="list-disc pl-4 my-1">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }

      // Parse inline markdown for non-list lines
      if (line.trim()) {
        elements.push(
          <span key={`p-${key++}`}>
            {parseInlineMarkdown(line)}
            {i < lines.length - 1 && <br />}
          </span>
        );
      } else if (i < lines.length - 1) {
        // Empty line - add spacing
        elements.push(<br key={`br-${key++}`} />);
      }
    }
  }

  // Close any remaining list
  if (listItems.length > 0) {
    elements.push(
      <ul key={`ul-${key++}`} className="list-disc pl-4 my-1">
        {listItems}
      </ul>
    );
  }

  return elements;
}

// Parse inline markdown (bold, italic, code, links)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Combined regex for all inline patterns
  // Order matters: bold before italic since ** contains *
  const patterns = [
    // Bold: **text**
    { regex: /\*\*([^*]+)\*\*/, type: 'bold' as const },
    // Italic: *text*
    { regex: /\*([^*]+)\*/, type: 'italic' as const },
    // Inline code: `code`
    { regex: /`([^`]+)`/, type: 'code' as const },
    // Link: [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: 'link' as const },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; match: RegExpExecArray; type: 'bold' | 'italic' | 'code' | 'link' } | null = null;

    // Find the earliest matching pattern
    for (const pattern of patterns) {
      const match = pattern.regex.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        earliestMatch = { index: match.index, match, type: pattern.type };
      }
    }

    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        elements.push(remaining.slice(0, earliestMatch.index));
      }

      const { match, type } = earliestMatch;

      // Add the formatted element
      switch (type) {
        case 'bold':
          elements.push(
            <strong key={`bold-${key++}`} className="font-semibold">
              {match[1]}
            </strong>
          );
          break;
        case 'italic':
          elements.push(
            <em key={`italic-${key++}`} className="italic">
              {match[1]}
            </em>
          );
          break;
        case 'code':
          elements.push(
            <code
              key={`code-${key++}`}
              className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400"
            >
              {match[1]}
            </code>
          );
          break;
        case 'link': {
          const linkText = match[1];
          let href = match[2];

          // Ensure URL has protocol
          if (!href.match(/^https?:\/\//i)) {
            href = 'https://' + href;
          }

          elements.push(
            <a
              key={`link-${key++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {linkText}
            </a>
          );
          break;
        }
      }

      // Continue with remaining text
      remaining = remaining.slice(earliestMatch.index + match[0].length);
    } else {
      // No more matches, add remaining text
      elements.push(remaining);
      break;
    }
  }

  return elements;
}

export function MarkdownMessage({ text, className }: MarkdownMessageProps) {
  const elements = parseMarkdown(text);

  return (
    <div className={cn('whitespace-pre-wrap break-words', className)}>
      {elements}
    </div>
  );
}

export default MarkdownMessage;
