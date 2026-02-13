import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../lib/queryClient';

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Team {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  members: TeamMember[];
  invites: TeamInvite[];
}

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function useTeams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: teams = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Team[], Error>({
    queryKey: queryKeys.teams.all,
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/teams'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch teams');
      const result = await response.json();
      return result.teams;
    },
    enabled: !!user,
  });

  const error = queryError?.message ?? null;

  const createTeamMutation = useMutation<Team, Error, { name: string; description?: string; organizationId?: string }>({
    mutationFn: async (teamData) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl('/api/teams'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(teamData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team');
      }
      const result = await response.json();
      return result.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const updateTeamMutation = useMutation<Team, Error, { teamId: string; updates: Partial<Pick<Team, 'name' | 'description'>> }>({
    mutationFn: async ({ teamId, updates }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update team');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const inviteMemberMutation = useMutation<unknown, Error, { teamId: string; email: string; role: 'admin' | 'member' }>({
    mutationFn: async ({ teamId, email, role }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/invite`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const acceptInviteMutation = useMutation<unknown, Error, string>({
    mutationFn: async (teamId) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/accept-invite`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const removeMemberMutation = useMutation<void, Error, { teamId: string; userId: string }>({
    mutationFn: async ({ teamId, userId }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/members/${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const updateMemberRoleMutation = useMutation<void, Error, { teamId: string; userId: string; role: 'owner' | 'admin' | 'member' }>({
    mutationFn: async ({ teamId, userId, role }) => {
      if (!user) throw new Error('Authentication required');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/members/${userId}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update member role');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  // Preserve original call signatures
  const createTeam = useCallback(
    async (teamData: { name: string; description?: string; organizationId?: string }) =>
      createTeamMutation.mutateAsync(teamData),
    [createTeamMutation]
  );
  const updateTeam = useCallback(
    async (teamId: string, updates: Partial<Pick<Team, 'name' | 'description'>>) =>
      updateTeamMutation.mutateAsync({ teamId, updates }),
    [updateTeamMutation]
  );
  const inviteMember = useCallback(
    async (teamId: string, email: string, role: 'admin' | 'member' = 'member') =>
      inviteMemberMutation.mutateAsync({ teamId, email, role }),
    [inviteMemberMutation]
  );
  const acceptInvite = useCallback(
    async (teamId: string) => acceptInviteMutation.mutateAsync(teamId),
    [acceptInviteMutation]
  );
  const removeMember = useCallback(
    async (teamId: string, userId: string) => removeMemberMutation.mutateAsync({ teamId, userId }),
    [removeMemberMutation]
  );
  const updateMemberRole = useCallback(
    async (teamId: string, userId: string, role: 'owner' | 'admin' | 'member') =>
      updateMemberRoleMutation.mutateAsync({ teamId, userId, role }),
    [updateMemberRoleMutation]
  );

  return {
    teams,
    loading,
    error,
    fetchTeams: refetch,
    createTeam,
    updateTeam,
    inviteMember,
    acceptInvite,
    removeMember,
    updateMemberRole,
  };
}
