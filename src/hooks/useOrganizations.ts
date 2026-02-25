import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '../services/apiService';
import { buildApiUrl } from '../config/environment';
import { queryKeys } from '../lib/queryClient';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  createdBy: string;
  createdAt: string;
  settings: {
    allowMemberInvites: boolean;
    requireApprovalForJoining: boolean;
    defaultMemberRole: 'member' | 'admin';
  };
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    memberLimit: number;
    teamLimit: number;
  };
}

export interface OrganizationMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  permissions: string[];
}

export interface OrganizationInvite {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
}

export function useOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);

  const {
    data: organizations = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Organization[], Error>({
    queryKey: queryKeys.organizations.all,
    queryFn: async () => {
      const response = await apiService.getOrganizations();
      if (response.success && response.data) {
        const data = response.data as { organizations?: Organization[] } | Organization[] | undefined;
        return Array.isArray(data) ? data : (data?.organizations ?? []);
      }
      throw new Error(response.error || 'Failed to fetch organizations');
    },
    enabled: !!user,
  });

  const error = queryError?.message ?? null;

  // Set current organization when data loads
  useEffect(() => {
    if (organizations.length > 0) {
      const storedOrgId = localStorage.getItem('current_organization');
      const org = storedOrgId ? organizations.find(o => o.id === storedOrgId) : null;
      setCurrentOrganization(org || organizations[0]);
    }
  }, [organizations]);

  const createOrgMutation = useMutation<Organization, Error, {
    name: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: Organization['size'];
  }>({
    mutationFn: async (orgData) => {
      if (!user) throw new Error('Authentication required');
      const response = await apiService.createOrganization(orgData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create organization');
      }
      const orgData2 = response.data as { organization?: Organization } | Organization;
      return (orgData2 && 'organization' in orgData2 ? orgData2.organization : orgData2) as Organization;
    },
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      if (organizations.length === 0) {
        setCurrentOrganization(newOrg);
      }
    },
  });

  const updateOrgMutation = useMutation<Organization, Error, { orgId: string; updates: Partial<Organization> }>({
    mutationFn: async ({ orgId, updates }) => {
      if (!user) throw new Error('Authentication required');
      // apiService has no PUT method — use makeRequest directly
      const result = await apiService.makeRequest<Organization>(
        buildApiUrl(`/api/organizations/${orgId}`),
        { method: 'PUT', body: JSON.stringify(updates) }
      );
      if (!result.success) throw new Error(result.error || 'Failed to update organization');
      return result.data as Organization;
    },
    onSuccess: (updatedOrg, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(updatedOrg);
      }
    },
  });

  const inviteMutation = useMutation<unknown, Error, { orgId: string; email: string; role: 'admin' | 'member'; message?: string }>({
    mutationFn: async ({ orgId, email, role, message }) => {
      if (!user) throw new Error('Authentication required');
      const result = await apiService.post(`/api/organizations/${orgId}/invite`, { email, role, message });
      if (!result.success) throw new Error(result.error || 'Failed to send invitation');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });

  const leaveMutation = useMutation<void, Error, string>({
    mutationFn: async (orgId) => {
      if (!user) throw new Error('Authentication required');
      const result = await apiService.post(`/api/organizations/${orgId}/leave`);
      if (!result.success) throw new Error(result.error || 'Failed to leave organization');
    },
    onSuccess: (_, orgId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(organizations.find(org => org.id !== orgId) || null);
      }
    },
  });

  // Preserve original call signatures
  const createOrganization = useCallback(
    async (orgData: Parameters<typeof createOrgMutation.mutateAsync>[0]) =>
      createOrgMutation.mutateAsync(orgData),
    [createOrgMutation]
  );
  const updateOrganization = useCallback(
    async (orgId: string, updates: Partial<Organization>) =>
      updateOrgMutation.mutateAsync({ orgId, updates }),
    [updateOrgMutation]
  );
  const inviteToOrganization = useCallback(
    async (orgId: string, email: string, role: 'admin' | 'member' = 'member', message?: string) =>
      inviteMutation.mutateAsync({ orgId, email, role, message }),
    [inviteMutation]
  );
  const switchOrganization = useCallback((orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('current_organization', orgId);
    }
  }, [organizations]);
  const leaveOrganization = useCallback(
    async (orgId: string) => leaveMutation.mutateAsync(orgId),
    [leaveMutation]
  );

  return {
    organizations,
    currentOrganization,
    loading,
    error,
    fetchOrganizations: refetch,
    createOrganization,
    updateOrganization,
    inviteToOrganization,
    switchOrganization,
    leaveOrganization,
  };
}
