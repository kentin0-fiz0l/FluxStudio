/**
 * Component Tests - Rich Text Composer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextComposer } from '../RichTextComposer';

describe('RichTextComposer', () => {
  const mockOnSend = vi.fn();
  const mockOnTyping = vi.fn();

  const mockParticipants = [
    { id: '1', name: 'John Doe', email: 'john@example.com', avatar: '' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: '' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render composer with placeholder', () => {
    render(<RichTextComposer onSend={mockOnSend} placeholder="Type a message..." />);

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('should call onTyping when user types', async () => {
    render(<RichTextComposer onSend={mockOnSend} onTyping={mockOnTyping} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello');

    expect(mockOnTyping).toHaveBeenCalled();
  });

  it('should send message on Enter key', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test message{Enter}');

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith('Test message', [], []);
    });
  });

  it('should NOT send on Shift+Enter (new line)', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(mockOnSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Line 1\nLine 2');
  });

  it('should clear content after sending', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test message{Enter}');

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('should show formatting toolbar when toggled', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    // Toolbar should not be visible initially
    expect(screen.queryByTitle('Bold')).not.toBeInTheDocument();

    // Click formatting button (Bold icon in action buttons)
    const formatButton = screen.getAllByRole('button')[0]; // First button is formatting toggle
    await userEvent.click(formatButton);

    // Toolbar should now be visible
    await waitFor(() => {
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
    });
  });

  it('should apply bold formatting with Cmd+B', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'test');

    // Select all text
    textarea.setSelectionRange(0, 4);

    // Apply bold with Cmd+B
    fireEvent.keyDown(textarea, { key: 'b', metaKey: true });

    await waitFor(() => {
      expect(textarea.value).toContain('**test**');
    });
  });

  it('should apply italic formatting with Cmd+I', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'test');

    textarea.setSelectionRange(0, 4);
    fireEvent.keyDown(textarea, { key: 'i', metaKey: true });

    await waitFor(() => {
      expect(textarea.value).toContain('_test_');
    });
  });

  it('should apply code formatting with Cmd+E', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'code');

    textarea.setSelectionRange(0, 4);
    fireEvent.keyDown(textarea, { key: 'e', metaKey: true });

    await waitFor(() => {
      expect(textarea.value).toContain('`code`');
    });
  });

  it('should show mention dropdown when typing @', async () => {
    render(<RichTextComposer onSend={mockOnSend} participants={mockParticipants} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello @');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  it('should filter mentions by search query', async () => {
    render(<RichTextComposer onSend={mockOnSend} participants={mockParticipants} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, '@john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('should insert mention on click', async () => {
    render(<RichTextComposer onSend={mockOnSend} participants={mockParticipants} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, '@');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('John Doe'));

    await waitFor(() => {
      expect(textarea).toHaveValue('@John Doe ');
    });
  });

  it('should navigate mentions with arrow keys', async () => {
    render(<RichTextComposer onSend={mockOnSend} participants={mockParticipants} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, '@');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Press down arrow to select second item
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });

    // Press Enter to select
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => {
      expect(textarea).toHaveValue('@Jane Smith ');
    });
  });

  it('should handle file attachments', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    // Should show attachment badge
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    // Send message with attachment
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Message with file{Enter}');

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith('Message with file', [], [file]);
    });
  });

  it('should remove attachments', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    // Click remove button
    const removeButton = screen.getByRole('button', { name: '' }); // X button
    await userEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });
  });

  it('should show character count', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello World');

    expect(screen.getByText('11 characters')).toBeInTheDocument();
  });

  it('should disable send button when empty', () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const sendButton = screen.getByRole('button', { name: '' }); // Send button
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when has content', async () => {
    render(<RichTextComposer onSend={mockOnSend} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test');

    const sendButtons = screen.getAllByRole('button');
    const sendButton = sendButtons[sendButtons.length - 1]; // Last button is send
    expect(sendButton).not.toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<RichTextComposer onSend={mockOnSend} disabled />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should track mentions in sent message', async () => {
    render(<RichTextComposer onSend={mockOnSend} participants={mockParticipants} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello @');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('John Doe'));

    await waitFor(() => {
      expect(textarea).toHaveValue('@John Doe ');
    });

    await userEvent.type(textarea, 'how are you?{Enter}');

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith(
        '@John Doe how are you?',
        ['1'], // John Doe's ID
        []
      );
    });
  });
});
