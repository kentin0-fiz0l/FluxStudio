/**
 * ProjectHeader Component Tests
 *
 * Tests: project name, status/priority badges, description, action buttons.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ProjectHeader } from '../ProjectHeader';

vi.mock('../project-dashboard-constants', () => ({
  STATUS_BADGE_COLORS: {
    active: 'bg-green-100 text-green-800',
    planning: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800',
  },
  PRIORITY_BADGE_COLORS: {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  },
}));

const baseProject = {
  name: 'Design System',
  status: 'active',
  priority: 'high',
  description: 'A comprehensive design system',
  createdAt: '2025-03-01T00:00:00Z',
  dueDate: '2025-06-01',
  metadata: { projectType: 'design' },
};

describe('ProjectHeader', () => {
  test('renders project name', () => {
    render(
      <ProjectHeader
        currentProject={baseProject}
        stats={null}
        handleFileUpload={vi.fn()}
      />
    );

    expect(screen.getByText('Design System')).toBeTruthy();
  });

  test('renders status and priority badges', () => {
    render(
      <ProjectHeader
        currentProject={baseProject}
        stats={null}
        handleFileUpload={vi.fn()}
      />
    );

    expect(screen.getByText('active')).toBeTruthy();
    expect(screen.getByText('high')).toBeTruthy();
  });

  test('renders description when provided', () => {
    render(
      <ProjectHeader
        currentProject={baseProject}
        stats={null}
        handleFileUpload={vi.fn()}
      />
    );

    expect(screen.getByText('A comprehensive design system')).toBeTruthy();
  });

  test('renders Upload Files button', () => {
    render(
      <ProjectHeader
        currentProject={baseProject}
        stats={null}
        handleFileUpload={vi.fn()}
      />
    );

    expect(screen.getByText('Upload Files')).toBeTruthy();
  });

  test('shows progress when stats are provided', () => {
    render(
      <ProjectHeader
        currentProject={baseProject}
        stats={{ completionPercentage: 75, totalFiles: 10, totalMembers: 3, totalFileSize: 1024, lastActivity: '2025-03-01' }}
        handleFileUpload={vi.fn()}
      />
    );

    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  test('renders project type from metadata', () => {
    render(
      <ProjectHeader
        currentProject={baseProject}
        stats={null}
        handleFileUpload={vi.fn()}
      />
    );

    expect(screen.getByText('design')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
  });
});
