import {
  Crown,
  Star,
  Award,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'lead_designer' | 'designer' | 'intern' | 'client_viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: Date;
  lastActive: Date;
  permissions: {
    canCreateProjects: boolean;
    canEditProjects: boolean;
    canDeleteProjects: boolean;
    canManageTeam: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canExportFiles: boolean;
    canManageClients: boolean;
  };
  workload: {
    activeProjects: number;
    completedProjects: number;
    hoursThisWeek: number;
    utilization: number;
  };
  skills: string[];
  specialties: string[];
  location?: string;
  timezone?: string;
}

export const roleConfig = {
  admin: {
    label: 'Administrator',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
    icon: Crown,
    description: 'Full platform access and team management'
  },
  lead_designer: {
    label: 'Lead Designer',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    icon: Star,
    description: 'Project leadership and design oversight'
  },
  designer: {
    label: 'Designer',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    icon: Award,
    description: 'Design creation and project collaboration'
  },
  intern: {
    label: 'Intern',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
    icon: Users,
    description: 'Limited access for learning and assistance'
  },
  client_viewer: {
    label: 'Client Viewer',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    icon: Eye,
    description: 'View-only access for client collaboration'
  }
};

export const statusConfig = {
  active: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle, label: 'Active' },
  pending: { color: 'text-yellow-600 dark:text-yellow-400', icon: Clock, label: 'Pending' },
  inactive: { color: 'text-gray-600 dark:text-gray-400', icon: XCircle, label: 'Inactive' }
};

export function formatLastActive(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function getUtilizationColor(utilization: number): string {
  if (utilization >= 90) return 'text-red-600 bg-red-50 dark:bg-red-900/30';
  if (utilization >= 70) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30';
  if (utilization >= 40) return 'text-green-600 bg-green-50 dark:bg-green-900/30';
  return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
}
