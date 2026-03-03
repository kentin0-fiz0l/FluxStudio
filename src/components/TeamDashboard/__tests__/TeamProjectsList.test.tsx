/**
 * TeamProjectsList Component Tests
 *
 * Tests: project cards, empty state, search, loading skeleton.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { TeamProjectsList } from '../TeamProjectsList';
import type { TeamProjectsListProps } from '../team-dashboard-types';

function defaultProps(overrides: Partial<TeamProjectsListProps> = {}): TeamProjectsListProps {
  return {
    filteredProjects: [],
    isLoadingProjects: false,
    navigateTo: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    setShowCreateProject: vi.fn(),
    ...overrides,
  };
}

describe('TeamProjectsList', () => {
  test('renders empty state when no projects', () => {
    render(<TeamProjectsList {...defaultProps()} />);

    expect(screen.getByText('No Projects Yet')).toBeTruthy();
    expect(screen.getByText('Create your first project to get started')).toBeTruthy();
    expect(screen.getByText('Create Project')).toBeTruthy();
  });

  test('renders project cards with name and status', () => {
    render(
      <TeamProjectsList
        {...defaultProps({
          filteredProjects: [
            { id: 'p1', name: 'Alpha', description: 'First project', status: 'active', priority: 'high', createdAt: '2025-01-01' },
            { id: 'p2', name: 'Beta', status: 'planning', priority: 'medium', createdAt: '2025-02-01' },
          ],
        })}
      />
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    expect(screen.getByText('planning')).toBeTruthy();
  });

  test('renders search input with placeholder', () => {
    render(<TeamProjectsList {...defaultProps()} />);

    expect(screen.getByPlaceholderText('Search projects...')).toBeTruthy();
  });

  test('renders project count badge', () => {
    render(
      <TeamProjectsList
        {...defaultProps({
          filteredProjects: [
            { id: 'p1', name: 'Alpha', status: 'active', priority: 'high', createdAt: '2025-01-01' },
          ],
        })}
      />
    );

    expect(screen.getByText('1')).toBeTruthy();
  });

  test('calls setShowCreateProject when Create Project button is clicked in empty state', async () => {
    const setShowCreateProject = vi.fn();
    const { user } = render(
      <TeamProjectsList {...defaultProps({ setShowCreateProject })} />
    );

    await user.click(screen.getByText('Create Project'));
    expect(setShowCreateProject).toHaveBeenCalledWith(true);
  });
});
