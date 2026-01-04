'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudioDashboard } from '@/components/studio/studio-dashboard';
import { useAuth, type User } from '@/lib/auth';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export default function StudioPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/studio');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchProjects() {
      if (!isAuthenticated) return;

      try {
        const data = await api.get<Project[]>('/api/projects');
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setProjectsLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Convert user to match StudioDashboard expected props
  const userProps = {
    id: user.id,
    email: user.email,
    user_metadata: {
      full_name: user.fullName,
      avatar_url: user.avatarUrl,
    },
  };

  // Convert projects to match expected format
  const projectProps = projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || null,
    status: p.status,
    organization_id: '',
    created_by: '',
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));

  return <StudioDashboard user={userProps as any} projects={projectProps} />;
}
