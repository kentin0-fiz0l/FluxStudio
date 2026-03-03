/**
 * OrgHeader Component Tests
 *
 * Tests: org name, description, stats, action buttons.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { OrgHeader } from '../OrgHeader';

const baseProps = {
  currentOrganization: { name: 'Acme Corp', description: 'Building the future' },
  stats: null as any,
  setShowCreateTeam: vi.fn(),
  setShowCreateProject: vi.fn(),
};

describe('OrgHeader', () => {
  test('renders organization name', () => {
    render(<OrgHeader {...baseProps} />);

    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });

  test('renders organization description', () => {
    render(<OrgHeader {...baseProps} />);

    expect(screen.getByText('Building the future')).toBeTruthy();
  });

  test('renders stats grid when stats are provided', () => {
    render(
      <OrgHeader
        {...baseProps}
        stats={{ totalTeams: 4, totalProjects: 12, totalMembers: 30, totalFiles: 100, storageUsed: 5000, storageLimit: 10000, activeProjects: 8, completedProjects: 4 }}
      />
    );

    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Teams')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('Members')).toBeTruthy();
  });

  test('calls setShowCreateTeam when New Team button is clicked', async () => {
    const setShowCreateTeam = vi.fn();
    const { user } = render(<OrgHeader {...baseProps} setShowCreateTeam={setShowCreateTeam} />);

    await user.click(screen.getByText('New Team'));
    expect(setShowCreateTeam).toHaveBeenCalledWith(true);
  });

  test('calls setShowCreateProject when New Project button is clicked', async () => {
    const setShowCreateProject = vi.fn();
    const { user } = render(<OrgHeader {...baseProps} setShowCreateProject={setShowCreateProject} />);

    await user.click(screen.getByText('New Project'));
    expect(setShowCreateProject).toHaveBeenCalledWith(true);
  });
});
