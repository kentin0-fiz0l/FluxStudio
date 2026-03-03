/**
 * ProjectSidebar Component Tests
 *
 * Tests: stats display, members list, empty members, view all button.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ProjectSidebar } from '../ProjectSidebar';

vi.mock('../project-dashboard-utils', () => ({
  formatFileSize: vi.fn((bytes: number) => `${(bytes / 1024).toFixed(1)} KB`),
}));

const baseProps = {
  stats: null,
  members: [] as any[],
  currentProject: { createdAt: '2025-01-15T00:00:00Z' },
};

describe('ProjectSidebar', () => {
  test('renders "No members assigned" when members list is empty', () => {
    render(<ProjectSidebar {...baseProps} />);

    expect(screen.getByText('No members assigned')).toBeTruthy();
  });

  test('renders project stats when provided', () => {
    render(
      <ProjectSidebar
        {...baseProps}
        stats={{
          totalFiles: 42,
          totalMembers: 8,
          totalFileSize: 10240,
          completionPercentage: 60,
          lastActivity: '2025-03-01',
        }}
      />
    );

    expect(screen.getByText('Project Stats')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('10.0 KB')).toBeTruthy();
  });

  test('renders member names and roles', () => {
    render(
      <ProjectSidebar
        {...baseProps}
        members={[
          { id: 'm1', userId: 'u1', projectId: 'p1', name: 'Alice', role: 'contributor' as const, joinedAt: '2025-01-01', invitedBy: 'u0', isActive: true, permissions: [] },
          { id: 'm2', userId: 'u2', projectId: 'p1', name: 'Bob', role: 'manager' as const, joinedAt: '2025-01-01', invitedBy: 'u0', isActive: true, permissions: [] },
        ]}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('contributor')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('manager')).toBeTruthy();
  });

  test('shows "View All" button when more than 5 members', () => {
    const members = Array.from({ length: 7 }, (_, i) => ({
      id: `m${i}`,
      userId: `u${i}`,
      projectId: 'p1',
      name: `Member ${i}`,
      role: 'contributor' as const,
      joinedAt: '2025-01-01',
      invitedBy: 'u0',
      isActive: true,
      permissions: [],
    }));

    render(<ProjectSidebar {...baseProps} members={members} />);

    expect(screen.getByText('View All (7)')).toBeTruthy();
  });

  test('renders Recent Activity section with project creation date', () => {
    render(<ProjectSidebar {...baseProps} />);

    expect(screen.getByText('Recent Activity')).toBeTruthy();
    expect(screen.getByText('Project created')).toBeTruthy();
  });
});
