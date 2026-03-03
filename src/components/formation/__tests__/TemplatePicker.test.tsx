/**
 * TemplatePicker Component Tests
 *
 * Tests template list, search, category filter, close/cancel.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Line Formation',
    description: 'Basic line',
    category: 'basic',
    parameters: { minPerformers: 4, maxPerformers: 50 },
    tags: ['line', 'simple'],
  },
  {
    id: 'tpl-2',
    name: 'Diamond Formation',
    description: 'Diamond shape',
    category: 'intermediate',
    parameters: { minPerformers: 8, maxPerformers: 40 },
    tags: ['shape'],
  },
];

vi.mock('@/services/formationTemplates/registry', () => ({
  templateRegistry: {
    getAllTemplates: () => mockTemplates,
    getByCategory: (cat: string) => mockTemplates.filter(t => t.category === cat),
    searchTemplates: ({ search }: { search: string }) => mockTemplates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    getCategories: () => [{ category: 'basic' }, { category: 'intermediate' }],
  },
}));

vi.mock('../templatePickerConstants', () => ({
  categoryIcons: { basic: null, intermediate: null, advanced: null },
  categoryLabels: { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' },
}));

vi.mock('../TemplateCard', () => ({
  TemplateCard: ({ template, onClick }: any) => (
    <div data-testid={`template-${template.id}`} onClick={onClick}>{template.name}</div>
  ),
}));

vi.mock('../TemplatePreviewPanel', () => ({
  TemplatePreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: any) => children,
}));

import { TemplatePicker } from '../TemplatePicker';

function defaultProps(overrides: Partial<Parameters<typeof TemplatePicker>[0]> = {}) {
  return {
    onApply: vi.fn(),
    onCancel: vi.fn(),
    performerCount: 12,
    ...overrides,
  };
}

describe('TemplatePicker', () => {
  test('renders Formation Templates heading', () => {
    render(<TemplatePicker {...defaultProps()} />);
    expect(screen.getByText('Formation Templates')).toBeTruthy();
  });

  test('renders search input', () => {
    render(<TemplatePicker {...defaultProps()} />);
    expect(screen.getByLabelText('Search templates')).toBeTruthy();
  });

  test('renders template cards', () => {
    render(<TemplatePicker {...defaultProps()} />);
    expect(screen.getByText('Line Formation')).toBeTruthy();
    expect(screen.getByText('Diamond Formation')).toBeTruthy();
  });

  test('renders category filter buttons', () => {
    render(<TemplatePicker {...defaultProps()} />);
    expect(screen.getByText('All Templates')).toBeTruthy();
    expect(screen.getByText('Basic')).toBeTruthy();
    expect(screen.getByText('Intermediate')).toBeTruthy();
  });

  test('calls onCancel when close button is clicked', async () => {
    const onCancel = vi.fn();
    const { user } = render(<TemplatePicker {...defaultProps({ onCancel })} />);
    await user.click(screen.getByLabelText('Close template picker'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('shows empty state heading in emptyState mode', () => {
    render(<TemplatePicker {...defaultProps({ emptyState: true })} />);
    expect(screen.getByText('Choose a Starting Formation')).toBeTruthy();
  });
});
