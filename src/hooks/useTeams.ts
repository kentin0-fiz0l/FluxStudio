import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/teams'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const result = await response.json();
      setTeams(result.teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createTeam = useCallback(async (teamData: {
    name: string;
    description?: string;
    organizationId?: string;
  }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/teams'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teamData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team');
      }

      const result = await response.json();
      setTeams(prev => [...prev, result.team]);
      return result.team;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }, [user]);

  const updateTeam = useCallback(async (teamId: string, updates: Partial<Pick<Team, 'name' | 'description'>>) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update team');
      }

      const updatedTeam = await response.json();
      setTeams(prev => prev.map(team => team.id === teamId ? updatedTeam : team));
      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }, [user]);

  const inviteMember = useCallback(async (teamId: string, email: string, role: 'admin' | 'member' = 'member') => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/invite`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, role })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }

      const result = await response.json();
      // Refresh teams to get updated invites
      await fetchTeams();
      return result;
    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  }, [user, fetchTeams]);

  const acceptInvite = useCallback(async (teamId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/accept-invite`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      const result = await response.json();
      setTeams(prev => [...prev, result.team]);
      return result;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }, [user]);

  const removeMember = useCallback(async (teamId: string, userId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/members/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }

      // Refresh teams to get updated members
      await fetchTeams();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }, [user, fetchTeams]);

  const updateMemberRole = useCallback(async (teamId: string, userId: string, role: 'owner' | 'admin' | 'member') => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/teams/${teamId}/members/${userId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update member role');
      }

      // Refresh teams to get updated members
      await fetchTeams();
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }, [user, fetchTeams]);

  // Fetch teams on mount
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    inviteMember,
    acceptInvite,
    removeMember,
    updateMemberRole
  };
}