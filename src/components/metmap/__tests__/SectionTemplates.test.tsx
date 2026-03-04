import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { SectionTemplates } from '../SectionTemplates';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

describe('SectionTemplates', () => {
  const onAddSection = vi.fn();

  it('renders 8 template buttons in default mode', () => {
    render(<SectionTemplates onAddSection={onAddSection} />);

    const expected = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Breakdown', 'Outro'];
    for (const name of expected) {
      expect(screen.getByText(`+ ${name}`)).toBeInTheDocument();
    }
  });

  it('calls onAddSection with template data on click', async () => {
    const { user } = render(<SectionTemplates onAddSection={onAddSection} />);
    await user.click(screen.getByText('+ Verse'));
    expect(onAddSection).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Verse', bars: 8 })
    );
  });

  it('template data includes name and bars', async () => {
    const { user } = render(<SectionTemplates onAddSection={onAddSection} />);
    await user.click(screen.getByText('+ Intro'));
    expect(onAddSection).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Intro', bars: 4 })
    );
  });

  it('renders compact mode with dropdown trigger', () => {
    render(<SectionTemplates onAddSection={onAddSection} compact />);
    expect(screen.getByText('Add Section')).toBeInTheDocument();
    // Dropdown items should still be in DOM (CSS-hidden via group-hover)
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('compact mode shows custom section option', () => {
    render(<SectionTemplates onAddSection={onAddSection} compact />);
    expect(screen.getByText('Custom section...')).toBeInTheDocument();
  });

  it('compact mode custom section calls onAddSection with defaults', async () => {
    const { user } = render(<SectionTemplates onAddSection={onAddSection} compact />);
    await user.click(screen.getByText('Custom section...'));
    expect(onAddSection).toHaveBeenCalledWith({ name: 'Section', bars: 4 });
  });

  it('compact mode template buttons call onAddSection', async () => {
    const { user } = render(<SectionTemplates onAddSection={onAddSection} compact />);
    await user.click(screen.getByText('Chorus'));
    expect(onAddSection).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Chorus', bars: 8 })
    );
  });

  it('applies className prop', () => {
    const { container } = render(
      <SectionTemplates onAddSection={onAddSection} className="my-class" />
    );
    expect(container.firstChild).toHaveClass('my-class');
  });
});
