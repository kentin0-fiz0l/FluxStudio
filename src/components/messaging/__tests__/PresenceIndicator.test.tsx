/**
 * PresenceIndicator (Messaging) Component Tests
 *
 * Tests status text, dot rendering, typing indicator, conversation header.
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@/test/utils';

import {
  PresenceIndicator,
  TypingIndicator,
  ConversationHeaderPresence,
} from '../PresenceIndicator';

describe('PresenceIndicator', () => {
  test('shows Online text for online status', () => {
    render(<PresenceIndicator status="online" />);
    expect(screen.getByText('Online')).toBeTruthy();
  });

  test('shows Away text for away status', () => {
    render(<PresenceIndicator status="away" />);
    expect(screen.getByText('Away')).toBeTruthy();
  });

  test('shows Busy text for busy status', () => {
    render(<PresenceIndicator status="busy" />);
    expect(screen.getByText('Busy')).toBeTruthy();
  });

  test('shows Offline text for offline status with no lastSeen', () => {
    render(<PresenceIndicator status="offline" />);
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  test('shows typing indicator when isTyping is true', () => {
    render(<PresenceIndicator status="online" isTyping />);
    expect(screen.getByText('typing')).toBeTruthy();
  });

  test('renders dot only when dotOnly is true', () => {
    const { container } = render(<PresenceIndicator status="online" dotOnly />);
    expect(screen.queryByText('Online')).toBeNull();
    expect(container.querySelector('span')).toBeTruthy();
  });
});

describe('TypingIndicator', () => {
  test('renders typing text', () => {
    render(<TypingIndicator />);
    expect(screen.getByText('typing')).toBeTruthy();
  });
});

describe('ConversationHeaderPresence', () => {
  test('shows member count for group conversations', () => {
    render(<ConversationHeaderPresence isGroup memberCount={5} />);
    expect(screen.getByText('5 members')).toBeTruthy();
  });

  test('shows Online for online direct conversation', () => {
    render(<ConversationHeaderPresence isOnline />);
    expect(screen.getByText('Online')).toBeTruthy();
  });
});
