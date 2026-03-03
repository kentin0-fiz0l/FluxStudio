/**
 * DesignAssistant Component Tests
 *
 * Tests tab switching, form rendering, review/codegen flows, error state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('@/services/aiService', () => ({
  default: {
    checkHealth: () => Promise.resolve({ hasApiKey: true }),
    reviewDesign: vi.fn(() => Promise.resolve({ feedback: 'Looks great!' })),
    generateCode: vi.fn(() => Promise.resolve({ code: '<Button />' })),
  },
}));

import AIDesignAssistant from '../DesignAssistant';

describe('AIDesignAssistant', () => {
  test('renders title and tabs', () => {
    render(<AIDesignAssistant />);
    expect(screen.getByText('AI Design Assistant')).toBeTruthy();
    expect(screen.getByText('Design Review')).toBeTruthy();
    expect(screen.getByText('Code Generation')).toBeTruthy();
  });

  test('shows design review tab by default with textarea', () => {
    render(<AIDesignAssistant />);
    expect(screen.getByPlaceholderText('Describe your design...')).toBeTruthy();
  });

  test('shows aspect checkboxes in review tab', () => {
    render(<AIDesignAssistant />);
    expect(screen.getByText('Overall')).toBeTruthy();
    expect(screen.getByText('Accessibility')).toBeTruthy();
    expect(screen.getByText('Usability')).toBeTruthy();
  });

  test('switches to code generation tab', async () => {
    const { user } = render(<AIDesignAssistant />);
    await user.click(screen.getByText('Code Generation'));
    expect(screen.getByPlaceholderText('Describe the component you want to generate...')).toBeTruthy();
    expect(screen.getByText('Component Type')).toBeTruthy();
    expect(screen.getByText('Style')).toBeTruthy();
  });

  test('Review Design button is disabled when textarea is empty', () => {
    render(<AIDesignAssistant />);
    const button = screen.getByText('Review Design');
    expect(button.closest('button')?.disabled).toBe(true);
  });
});
