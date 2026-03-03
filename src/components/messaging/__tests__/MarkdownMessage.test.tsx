/**
 * MarkdownMessage Component Tests
 *
 * Tests bold, italic, code, links, lists rendering.
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@/test/utils';

import { MarkdownMessage } from '../MarkdownMessage';

describe('MarkdownMessage', () => {
  test('renders plain text', () => {
    render(<MarkdownMessage text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  test('renders bold text', () => {
    const { container } = render(<MarkdownMessage text="This is **bold** text" />);
    const strong = container.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe('bold');
  });

  test('renders italic text', () => {
    const { container } = render(<MarkdownMessage text="This is *italic* text" />);
    const em = container.querySelector('em');
    expect(em).toBeTruthy();
    expect(em?.textContent).toBe('italic');
  });

  test('renders inline code', () => {
    const { container } = render(<MarkdownMessage text="Use `console.log` here" />);
    const code = container.querySelector('code');
    expect(code).toBeTruthy();
    expect(code?.textContent).toBe('console.log');
  });

  test('renders links with target blank', () => {
    const { container } = render(<MarkdownMessage text="Visit [Example](https://example.com)" />);
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.textContent).toBe('Example');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('renders bullet lists', () => {
    const text = '- Item one\n- Item two';
    const { container } = render(<MarkdownMessage text={text} />);
    const items = container.querySelectorAll('li');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  test('renders empty content gracefully', () => {
    const { container } = render(<MarkdownMessage text="" />);
    expect(container.querySelector('div')).toBeTruthy();
  });
});
