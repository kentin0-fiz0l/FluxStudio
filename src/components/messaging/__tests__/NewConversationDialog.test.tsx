/**
 * NewConversationDialog Component Tests
 *
 * Tests dialog rendering, user search, user selection,
 * group name input, loading/empty states, and create action.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { NewConversationDialog } from '../NewConversationDialog';
import type { NewConversationDialogProps } from '../NewConversationDialog';
import type { MessageUser } from '../types';

// Mock ChatAvatar
vi.mock('../ChatMessageBubble', () => ({
  ChatAvatar: vi.fn(({ user }: { user: MessageUser }) => (
    <div data-testid="chat-avatar">{user.name}</div>
  )),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noop() {}

const userAlice: MessageUser = {
  id: 'u1',
  name: 'Alice Smith',
  initials: 'AS',
  isOnline: true,
};

const userBob: MessageUser = {
  id: 'u2',
  name: 'Bob Jones',
  initials: 'BJ',
  isOnline: false,
};

function defaultProps(overrides: Partial<NewConversationDialogProps> = {}): NewConversationDialogProps {
  return {
    open: true,
    onOpenChange: noop,
    selectedUsers: [],
    onToggleUser: noop,
    searchTerm: '',
    onSearchChange: noop,
    groupName: '',
    onGroupNameChange: noop,
    availableUsers: [userAlice, userBob],
    isLoading: false,
    onCreateConversation: noop,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NewConversationDialog', () => {
  test('renders dialog title', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    expect(screen.getByText('New Conversation')).toBeTruthy();
  });

  test('renders dialog description', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    expect(screen.getByText('Search for team members to start a conversation')).toBeTruthy();
  });

  test('renders search input', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    expect(screen.getByPlaceholderText('Search by name or email...')).toBeTruthy();
  });

  test('calls onSearchChange when typing in search', async () => {
    const onSearch = vi.fn();
    const { user } = render(
      <NewConversationDialog {...defaultProps({ onSearchChange: onSearch })} />
    );

    const input = screen.getByPlaceholderText('Search by name or email...');
    await user.type(input, 'ali');
    expect(onSearch).toHaveBeenCalled();
  });

  test('renders available users', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    // Each user appears in both the ChatAvatar mock and the text; use getAllByText
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThanOrEqual(1);
  });

  test('shows online status for online users', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  test('shows "Team Members" label when no search term', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    expect(screen.getByText('Team Members')).toBeTruthy();
  });

  test('shows "Search Results" label when search term is present', () => {
    render(<NewConversationDialog {...defaultProps({ searchTerm: 'alice' })} />);

    expect(screen.getByText('Search Results')).toBeTruthy();
  });

  test('calls onToggleUser when a user is clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <NewConversationDialog {...defaultProps({ onToggleUser: onToggle })} />
    );

    // Multiple elements have the text (avatar mock + label); click the first button containing it
    const allAlice = screen.getAllByText('Alice Smith');
    const clickTarget = allAlice.find((el) => el.closest('button'));
    expect(clickTarget).toBeTruthy();
    await user.click(clickTarget!);
    expect(onToggle).toHaveBeenCalledWith(userAlice);
  });

  test('renders selected user chips', () => {
    render(
      <NewConversationDialog {...defaultProps({ selectedUsers: [userAlice] })} />
    );

    // The chip shows the user name
    const chips = screen.getAllByText('Alice Smith');
    // One in the chip area, one in the user list
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });

  test('shows "Start Chat" button for single user selection', () => {
    render(
      <NewConversationDialog {...defaultProps({ selectedUsers: [userAlice] })} />
    );

    expect(screen.getByText('Start Chat')).toBeTruthy();
  });

  test('shows "Create Group" button for multiple user selection', () => {
    render(
      <NewConversationDialog
        {...defaultProps({ selectedUsers: [userAlice, userBob] })}
      />
    );

    expect(screen.getByText('Create Group')).toBeTruthy();
  });

  test('shows group name input when multiple users are selected', () => {
    render(
      <NewConversationDialog
        {...defaultProps({ selectedUsers: [userAlice, userBob] })}
      />
    );

    expect(screen.getByPlaceholderText('Enter group name...')).toBeTruthy();
    expect(screen.getByText('Group Name (optional)')).toBeTruthy();
  });

  test('does not show group name input for single selection', () => {
    render(
      <NewConversationDialog {...defaultProps({ selectedUsers: [userAlice] })} />
    );

    expect(screen.queryByPlaceholderText('Enter group name...')).toBeNull();
  });

  test('calls onGroupNameChange when group name is typed', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <NewConversationDialog
        {...defaultProps({
          selectedUsers: [userAlice, userBob],
          onGroupNameChange: onChange,
        })}
      />
    );

    const input = screen.getByPlaceholderText('Enter group name...');
    await user.type(input, 'Team');
    expect(onChange).toHaveBeenCalled();
  });

  test('disables create button when no users are selected', () => {
    render(<NewConversationDialog {...defaultProps({ selectedUsers: [] })} />);

    const startBtn = screen.getByText('Start Chat');
    expect(startBtn.closest('button')?.disabled).toBe(true);
  });

  test('calls onCreateConversation when create button is clicked', async () => {
    const onCreate = vi.fn();
    const { user } = render(
      <NewConversationDialog
        {...defaultProps({
          selectedUsers: [userAlice],
          onCreateConversation: onCreate,
        })}
      />
    );

    await user.click(screen.getByText('Start Chat'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  test('shows loading spinner when isLoading', () => {
    render(
      <NewConversationDialog
        {...defaultProps({ isLoading: true, availableUsers: [] })}
      />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  test('shows empty state when no users available', () => {
    render(
      <NewConversationDialog {...defaultProps({ availableUsers: [] })} />
    );

    expect(screen.getByText('No team members available')).toBeTruthy();
  });

  test('shows "No users found" when search returns empty', () => {
    render(
      <NewConversationDialog
        {...defaultProps({ searchTerm: 'xyz', availableUsers: [] })}
      />
    );

    expect(screen.getByText('No users found')).toBeTruthy();
  });

  test('renders cancel button', () => {
    render(<NewConversationDialog {...defaultProps()} />);

    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  test('calls onOpenChange(false) when cancel is clicked', async () => {
    const onOpen = vi.fn();
    const { user } = render(
      <NewConversationDialog {...defaultProps({ onOpenChange: onOpen })} />
    );

    await user.click(screen.getByText('Cancel'));
    expect(onOpen).toHaveBeenCalledWith(false);
  });

  test('does not render content when dialog is closed', () => {
    render(<NewConversationDialog {...defaultProps({ open: false })} />);

    expect(screen.queryByText('New Conversation')).toBeNull();
  });
});
