import { ProjectType, ServiceCategory, ServiceTier, EnsembleType, ProjectMetadata } from './services';

export type OrganizationRole = 'owner' | 'admin' | 'member';
export type TeamRole = 'lead' | 'member' | 'viewer';
export type ProjectRole = 'manager' | 'contributor' | 'viewer';
export type FilePermission = 'read' | 'write' | 'delete' | 'share';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  settings: {
    allowTeamCreation: boolean;
    allowProjectCreation: boolean;
    defaultTeamRole: TeamRole;
    defaultProjectRole: ProjectRole;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationIds: string[]; // Teams can belong to multiple organizations
  primaryOrganizationId: string; // Primary organization for admin purposes
  createdAt: string;
  updatedAt: string;
  leadId: string;
  memberCount?: number; // Number of members in the team
  projectIds?: string[]; // Projects this team is working on
  settings: {
    isPrivate: boolean;
    allowProjectCreation: boolean;
    defaultProjectRole: ProjectRole;
    crossOrganizational: boolean; // Whether team can work across organizations
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  teamIds: string[]; // Projects can have multiple teams working on them
  primaryTeamId?: string; // Primary team responsible for the project
  createdAt: string;
  updatedAt: string;
  managerId: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  settings: {
    isPrivate: boolean;
    allowFileSharing: boolean;
    requireApproval: boolean;
    multiTeamCollaboration: boolean; // Whether multiple teams can collaborate
  };
  metadata: {
    clientName?: string;
    projectType: ProjectType;
    serviceCategory: ServiceCategory;
    serviceTier: ServiceTier;
    ensembleType: EnsembleType;
    budget?: number;
    tags: string[];
    projectDetails?: ProjectMetadata;
  };
}

export interface ProjectFile {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  version: number;
  isLatest: boolean;
  category: 'design' | 'reference' | 'final' | 'feedback' | 'other';
  status: 'draft' | 'review' | 'approved' | 'rejected';
  metadata: {
    width?: number;
    height?: number;
    duration?: number; // for videos
    pages?: number; // for PDFs
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  joinedAt: string;
  invitedBy: string;
  isActive: boolean;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  joinedAt: string;
  invitedBy: string;
  isActive: boolean;
  name?: string;
  email?: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  joinedAt: string;
  invitedBy: string;
  isActive: boolean;
  permissions: FilePermission[];
  name?: string;
  email?: string;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  email: string;
  role: ProjectRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
}

// User interface extended with organization context
export interface UserWithOrganizations {
  id: string;
  email: string;
  name: string;
  userType: 'client' | 'designer' | 'admin';
  createdAt: string;
  organizations: Array<{
    organization: Organization;
    role: OrganizationRole;
    isActive: boolean;
  }>;
  activeOrganizationId?: string;
}

// Hierarchy navigation context
export interface OrganizationContext {
  currentOrganization: Organization | null;
  currentTeam: Team | null;
  currentProject: Project | null;
  breadcrumbs: Array<{
    type: 'organization' | 'team' | 'project';
    id: string;
    name: string;
    path: string;
  }>;
}

// API Response types
export interface OrganizationStats {
  totalMembers: number;
  totalTeams: number;
  totalProjects: number;
  totalFiles: number;
  storageUsed: number;
  storageLimit: number;
  activeProjects: number;
  completedProjects: number;
}

export interface TeamStats {
  totalMembers: number;
  totalProjects: number;
  totalOrganizations: number; // Number of organizations the team works with
  totalFiles: number;
  activeProjects: number;
  completedProjects: number;
  crossOrganizationalProjects: number; // Projects spanning multiple organizations
}

export interface ProjectStats {
  totalMembers: number;
  totalFiles: number;
  totalFileSize: number;
  completionPercentage: number;
  daysRemaining?: number;
  lastActivity: string;
}