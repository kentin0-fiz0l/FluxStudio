/**
 * TeamHeader Component Tests
 *
 * Tests: team name, description, private badge, stats, action buttons.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { TeamHeader } from '../TeamHeader';

const baseTeam = {
  id: 't1',
  name: 'Creative Team',
  description: 'We build beautiful things',
  createdAt: '2025-01-01',
  settings: { isPrivate: false },
};

describe('TeamHeader', () => {
  test('renders team name', () => {
    render(
      <TeamHeader currentTeam={baseTeam} stats={null} setShowCreateProject={vi.fn()} />
    );

    expect(screen.getByText('Creative Team')).toBeTruthy();
  });

  test('renders team description', () => {
    render(
      <TeamHeader currentTeam={baseTeam} stats={null} setShowCreateProject={vi.fn()} />
    );

    expect(screen.getByText('We build beautiful things')).toBeTruthy();
  });

  test('shows Private badge when team is private', () => {
    render(
      <TeamHeader
        currentTeam={{ ...baseTeam, settings: { isPrivate: true } }}
        stats={null}
        setShowCreateProject={vi.fn()}
      />
    );

    expect(screen.getByText('Private')).toBeTruthy();
  });

  test('does not show Private badge when team is public', () => {
    render(
      <TeamHeader currentTeam={baseTeam} stats={null} setShowCreateProject={vi.fn()} />
    );

    expect(screen.queryByText('Private')).toBeNull();
  });

  test('renders stats grid when stats are provided', () => {
    render(
      <TeamHeader
        currentTeam={baseTeam}
        stats={{ totalMembers: 12, totalProjects: 5, totalOrganizations: 1, totalFiles: 20, activeProjects: 3, completedProjects: 2, crossOrganizationalProjects: 0 }}
        setShowCreateProject={vi.fn()}
      />
    );

    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Members')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  test('calls setShowCreateProject when New Project button is clicked', async () => {
    const setShowCreateProject = vi.fn();
    const { user } = render(
      <TeamHeader currentTeam={baseTeam} stats={null} setShowCreateProject={setShowCreateProject} />
    );

    await user.click(screen.getByText('New Project'));
    expect(setShowCreateProject).toHaveBeenCalledWith(true);
  });
});
