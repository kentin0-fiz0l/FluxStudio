/**
 * TeamManagement Component Tests
 *
 * Tests: member list, invite button, search, role/status filters, stats.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { TeamManagement } from '../TeamManagement';
import type { TeamMember } from '../teamConfig';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('../TeamMemberTable', () => ({
  TeamMemberTable: ({ members }: { members: any[] }) => (
    <div data-testid="team-member-table">{members.length} members</div>
  ),
}));

vi.mock('../InviteMemberModal', () => ({
  InviteMemberModal: () => <div data-testid="invite-modal" />,
}));

vi.mock('../MemberDetailsModal', () => ({
  MemberDetailsModal: () => <div data-testid="member-details-modal" />,
}));

vi.mock('../teamConfig', async () => {
  const actual = await vi.importActual('../teamConfig');
  return {
    ...actual,
    roleConfig: {
      admin: { label: 'Administrator' },
      lead_designer: { label: 'Lead Designer' },
      designer: { label: 'Designer' },
      intern: { label: 'Intern' },
      client_viewer: { label: 'Client Viewer' },
    },
    statusConfig: {
      active: { label: 'Active' },
      pending: { label: 'Pending' },
      inactive: { label: 'Inactive' },
    },
  };
});

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'tm1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'designer',
    status: 'active',
    joinedAt: new Date('2025-01-01'),
    lastActive: new Date(),
    permissions: {
      canCreateProjects: true,
      canEditProjects: true,
      canDeleteProjects: false,
      canManageTeam: false,
      canViewAnalytics: true,
      canManageBilling: false,
      canExportFiles: true,
      canManageClients: false,
    },
    workload: {
      activeProjects: 3,
      completedProjects: 5,
      hoursThisWeek: 32,
      utilization: 80,
    },
    skills: ['UI Design'],
    specialties: ['Figma'],
    ...overrides,
  };
}

const adminUser = makeMember({
  id: 'admin1',
  name: 'Admin User',
  role: 'admin',
  permissions: {
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canManageTeam: true,
    canViewAnalytics: true,
    canManageBilling: true,
    canExportFiles: true,
    canManageClients: true,
  },
});

describe('TeamManagement', () => {
  test('renders heading and description', () => {
    render(
      <TeamManagement
        team={[adminUser]}
        currentUser={adminUser}
        onInviteUser={vi.fn()}
        onUpdateMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={vi.fn()}
      />
    );

    expect(screen.getByText('Team Management')).toBeTruthy();
    expect(screen.getByText('Manage your team members, roles, and permissions')).toBeTruthy();
  });

  test('shows Invite Member button for users with canManageTeam permission', () => {
    render(
      <TeamManagement
        team={[adminUser]}
        currentUser={adminUser}
        onInviteUser={vi.fn()}
        onUpdateMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={vi.fn()}
      />
    );

    expect(screen.getByText('Invite Member')).toBeTruthy();
  });

  test('hides Invite Member button for users without canManageTeam permission', () => {
    const regularUser = makeMember();
    render(
      <TeamManagement
        team={[regularUser]}
        currentUser={regularUser}
        onInviteUser={vi.fn()}
        onUpdateMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={vi.fn()}
      />
    );

    expect(screen.queryByText('Invite Member')).toBeNull();
  });

  test('renders team stats cards', () => {
    const members = [
      adminUser,
      makeMember({ id: 'tm2', name: 'Bob', status: 'pending', workload: { activeProjects: 0, completedProjects: 0, hoursThisWeek: 0, utilization: 40 } }),
    ];

    render(
      <TeamManagement
        team={members}
        currentUser={adminUser}
        onInviteUser={vi.fn()}
        onUpdateMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={vi.fn()}
      />
    );

    expect(screen.getByText('Total Members')).toBeTruthy();
    expect(screen.getByText('Active Members')).toBeTruthy();
    expect(screen.getByText('Pending Invites')).toBeTruthy();
    expect(screen.getByText('Avg Utilization')).toBeTruthy();
  });

  test('renders search input for filtering members', () => {
    render(
      <TeamManagement
        team={[adminUser]}
        currentUser={adminUser}
        onInviteUser={vi.fn()}
        onUpdateMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText('Search team members...')).toBeTruthy();
  });
});
