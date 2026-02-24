import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '@/config/environment';
import { useAuth } from '@/store/slices/authSlice';
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
      const response = await apiService.get<{ teams: Team[] }>('/teams');
      if (!response.success) throw new Error(response.error || 'Failed to fetch teams');
      return (response.data as { teams: Team[] }).teams;
    },
    enabled: !!user,
  });

  const error = queryError?.message ?? null;

  const createTeamMutation = useMutation<Team, Error, { name: string; description?: string; organizationId?: string }>({
    mutationFn: async (teamData) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.post<{ team: Team }>('/teams', teamData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create team');
      }
      return (response.data as { team: Team }).team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const updateTeamMutation = useMutation<Team, Error, { teamId: string; updates: Partial<Pick<Team, 'name' | 'description'>> }>({
    mutationFn: async ({ teamId, updates }) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.makeRequest<Team>(buildApiUrl(`/teams/${teamId}`), {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update team');
      }
      return response.data as Team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const inviteMemberMutation = useMutation<unknown, Error, { teamId: string; email: string; role: 'admin' | 'member' }>({
    mutationFn: async ({ teamId, email, role }) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.post(`/teams/${teamId}/invite`, { email, role });
      if (!response.success) {
        throw new Error(response.error || 'Failed to send invitation');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const acceptInviteMutation = useMutation<unknown, Error, string>({
    mutationFn: async (teamId) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.post(`/teams/${teamId}/accept-invite`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to accept invitation');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const removeMemberMutation = useMutation<void, Error, { teamId: string; userId: string }>({
    mutationFn: async ({ teamId, userId }) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.delete(`/teams/${teamId}/members/${userId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove member');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  const updateMemberRoleMutation = useMutation<void, Error, { teamId: string; userId: string; role: 'owner' | 'admin' | 'member' }>({
    mutationFn: async ({ teamId, userId, role }) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.makeRequest(buildApiUrl(`/teams/${teamId}/members/${userId}`), {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update member role');
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
