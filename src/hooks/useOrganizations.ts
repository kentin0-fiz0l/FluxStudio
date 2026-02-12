import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getOrganizations();

      if (response.success && response.data) {
        const data = response.data as { organizations?: Organization[] } | Organization[] | undefined;
        const organizations: Organization[] = Array.isArray(data) ? data : (data?.organizations ?? []);
        setOrganizations(organizations);

        // Set current organization if user has one
        if (organizations.length > 0) {
          setCurrentOrganization(organizations[0]);
        }
      } else {
        throw new Error(response.error || 'Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch organizations');
      // Initialize with empty array on error
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createOrganization = useCallback(async (orgData: {
    name: string;
    description?: string;
    website?: string;
    industry?: string;
    size?: Organization['size'];
  }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const response = await apiService.createOrganization(orgData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create organization');
      }

      const orgData2 = response.data as { organization?: Organization } | Organization;
      const newOrg = (orgData2 && 'organization' in orgData2 ? orgData2.organization : orgData2) as Organization;

      setOrganizations(prev => [...prev, newOrg]);

      // Set as current organization if it's the user's first org
      if (organizations.length === 0) {
        setCurrentOrganization(newOrg);
      }

      return newOrg;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }, [user, organizations.length]);

  const updateOrganization = useCallback(async (orgId: string, updates: Partial<Organization>) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/organizations/${orgId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update organization');
      }

      const updatedOrg = await response.json();
      setOrganizations(prev => prev.map(org => org.id === orgId ? updatedOrg : org));

      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(updatedOrg);
      }

      return updatedOrg;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }, [user, currentOrganization?.id]);

  const inviteToOrganization = useCallback(async (orgId: string, email: string, role: 'admin' | 'member' = 'member', message?: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/organizations/${orgId}/invite`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, role, message })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }

      const result = await response.json();
      await fetchOrganizations(); // Refresh to get updated invites
      return result;
    } catch (error) {
      console.error('Error inviting to organization:', error);
      throw error;
    }
  }, [user, fetchOrganizations]);

  const switchOrganization = useCallback((orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      // Store preference in localStorage
      localStorage.setItem('current_organization', orgId);
    }
  }, [organizations]);

  const leaveOrganization = useCallback(async (orgId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/organizations/${orgId}/leave`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to leave organization');
      }

      setOrganizations(prev => prev.filter(org => org.id !== orgId));

      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(organizations.find(org => org.id !== orgId) || null);
      }
    } catch (error) {
      console.error('Error leaving organization:', error);
      throw error;
    }
  }, [user, currentOrganization?.id, organizations]);

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Restore current organization from localStorage
  useEffect(() => {
    const storedOrgId = localStorage.getItem('current_organization');
    if (storedOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === storedOrgId);
      if (org) {
        setCurrentOrganization(org);
      }
    }
  }, [organizations]);

  return {
    organizations,
    currentOrganization,
    loading,
    error,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    inviteToOrganization,
    switchOrganization,
    leaveOrganization
  };
}