/**
 * MessageComposer Component Tests
 *
 * Tests the message input, send/record toggle, formatting toolbar,
 * emoji picker, reply preview, pending attachments, and keyboard shortcuts.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { MessageComposer } from '../MessageComposer';
import type { MessageComposerProps } from '../MessageComposer';
import type { ReplyContext, PendingAttachment } from '../types';

// Mock utils
vi.mock('../utils', () => ({
  formatFileSize: vi.fn((bytes: number) => `${bytes} B`),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noop() {}

function defaultProps(overrides: Partial<MessageComposerProps> = {}): MessageComposerProps {
  return {
    value: '',
    onChange: noop,
    onSend: noop,
    onAttach: noop,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MessageComposer', () => {
  test('renders textarea with default placeholder', () => {
    render(<MessageComposer {...defaultProps()} />);

    expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
  });

  test('renders textarea with custom placeholder', () => {
    render(<MessageComposer {...defaultProps({ placeholder: 'Say something...' })} />);

    expect(screen.getByPlaceholderText('Say something...')).toBeTruthy();
  });

  test('renders current value in textarea', () => {
    render(<MessageComposer {...defaultProps({ value: 'Hello' })} />);

    const textarea = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Hello');
  });

  test('calls onChange when typing', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <MessageComposer {...defaultProps({ onChange })} />
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Hi');
    expect(onChange).toHaveBeenCalled();
  });

  test('shows send button when there is content', () => {
    render(<MessageComposer {...defaultProps({ value: 'Hello' })} />);

    expect(screen.getByTitle('Send message')).toBeTruthy();
  });

  test('shows microphone button when input is empty', () => {
    render(<MessageComposer {...defaultProps({ value: '' })} />);

    expect(screen.getByTitle('Record voice message')).toBeTruthy();
  });

  test('calls onSend when send button is clicked', async () => {
    const onSend = vi.fn();
    const { user } = render(
      <MessageComposer {...defaultProps({ value: 'Hello', onSend })} />
    );

    await user.click(screen.getByTitle('Send message'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  test('calls onAttach when attach button is clicked', async () => {
    const onAttach = vi.fn();
    const { user } = render(
      <MessageComposer {...defaultProps({ onAttach })} />
    );

    await user.click(screen.getByTitle('Attach file'));
    expect(onAttach).toHaveBeenCalledTimes(1);
  });

  test('renders formatting toolbar', () => {
    render(<MessageComposer {...defaultProps()} />);

    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeTruthy();
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeTruthy();
    expect(screen.getByTitle('Code (Ctrl+`)')).toBeTruthy();
    expect(screen.getByTitle('Link (Ctrl+K)')).toBeTruthy();
  });

  test('renders keyboard hint text', () => {
    render(<MessageComposer {...defaultProps()} />);

    expect(screen.getByText(/to send/)).toBeTruthy();
    expect(screen.getByText(/for new line/)).toBeTruthy();
  });

  test('renders markdown supported hint', () => {
    render(<MessageComposer {...defaultProps()} />);

    expect(screen.getByText('Markdown supported')).toBeTruthy();
  });

  test('disables textarea when disabled prop is true', () => {
    render(<MessageComposer {...defaultProps({ disabled: true })} />);

    const textarea = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  test('renders reply preview when replyTo is provided', () => {
    const replyTo: ReplyContext = {
      id: 'msg-1',
      content: 'Original message content',
      author: { id: 'u1', name: 'Alice', initials: 'A' },
    };
    render(<MessageComposer {...defaultProps({ replyTo })} />);

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Original message content')).toBeTruthy();
  });

  test('does not render reply preview when replyTo is undefined', () => {
    render(<MessageComposer {...defaultProps()} />);

    expect(screen.queryByText('Original message content')).toBeNull();
  });

  test('renders pending attachments', () => {
    const attachments: PendingAttachment[] = [
      {
        id: 'att-1',
        file: new File(['content'], 'design.png', { type: 'image/png' }),
      },
    ];
    render(<MessageComposer {...defaultProps({ pendingAttachments: attachments })} />);

    expect(screen.getByText('design.png')).toBeTruthy();
  });

  test('shows send button when pendingAttachments exist even if value is empty', () => {
    const attachments: PendingAttachment[] = [
      {
        id: 'att-1',
        file: new File(['content'], 'doc.pdf', { type: 'application/pdf' }),
      },
    ];
    render(<MessageComposer {...defaultProps({ pendingAttachments: attachments })} />);

    expect(screen.getByTitle('Send message')).toBeTruthy();
  });
});
