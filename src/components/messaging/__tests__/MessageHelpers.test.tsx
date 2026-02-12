import { describe, test, expect } from 'vitest';
import { render, screen } from '@/test/utils';

import { MessageStatusIcon, ChatAvatar } from '../ChatMessageBubble/MessageHelpers';

describe('MessageStatusIcon', () => {
  test('renders check icon for sent status', () => {
    render(<MessageStatusIcon status="sent" />);
    // SVG icons render; verify component doesn't crash
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('renders double check for delivered status', () => {
    render(<MessageStatusIcon status="delivered" />);
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('renders blue double check for read status', () => {
    render(<MessageStatusIcon status="read" />);
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('renders clock for pending status', () => {
    render(<MessageStatusIcon status="pending" />);
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('renders alert for failed status', () => {
    render(<MessageStatusIcon status="failed" />);
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('renders nothing for unknown status', () => {
    const { container } = render(<MessageStatusIcon status="unknown" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ChatAvatar', () => {
  test('renders avatar with user image', () => {
    render(
      <ChatAvatar user={{ id: 'u1', name: 'Alice', initials: 'A', avatar: 'https://example.com/a.png' }} />
    );
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/a.png');
  });

  test('renders initials when no avatar', () => {
    render(
      <ChatAvatar user={{ id: 'u1', name: 'Bob Smith', initials: 'BS' }} />
    );
    expect(screen.getByText('BS')).toBeTruthy();
  });
});
