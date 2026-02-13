import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ProjectsHeader } from '../ProjectsHeader';

describe('ProjectsHeader', () => {
  test('renders title and create button', () => {
    render(<ProjectsHeader onCreateProject={vi.fn()} />);
    expect(screen.getByText('Projects')).toBeDefined();
    expect(screen.getByText('New Project')).toBeDefined();
  });

  test('calls onCreateProject when button clicked', async () => {
    const onCreateProject = vi.fn();
    const { userEvent } = await import('@/test/utils');
    const user = userEvent.setup();
    render(<ProjectsHeader onCreateProject={onCreateProject} />);
    await user.click(screen.getByText('New Project'));
    expect(onCreateProject).toHaveBeenCalledOnce();
  });

  test('forwards createButtonRef', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement>;
    render(<ProjectsHeader onCreateProject={vi.fn()} createButtonRef={ref} />);
    expect(ref.current).toBeTruthy();
  });
});
