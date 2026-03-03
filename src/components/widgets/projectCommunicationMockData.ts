import type { MessageUser, Priority } from '../../types/messaging';

export interface ProjectMilestone {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: Date;
  progress: number;
  assignees: MessageUser[];
  priority: Priority;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: MessageUser;
  uploadedAt: Date;
  hasComments: boolean;
  commentCount: number;
  isLatestVersion: boolean;
  version: string;
}

// Factory functions to create mock data with fresh dates
function createMockProjectMilestones(): ProjectMilestone[] {
  const now = Date.now();
  return [
    {
      id: 'milestone-1',
      name: 'Uniform Design Concepts',
      status: 'completed',
      dueDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      progress: 100,
      assignees: [
        { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
      ],
      priority: 'high'
    },
    {
      id: 'milestone-2',
      name: 'Client Feedback Integration',
      status: 'in_progress',
      dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
      progress: 65,
      assignees: [
        { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
      ],
      priority: 'high'
    },
    {
      id: 'milestone-3',
      name: 'Final Designs & Production',
      status: 'pending',
      dueDate: new Date(now + 14 * 24 * 60 * 60 * 1000),
      progress: 0,
      assignees: [
        { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
      ],
      priority: 'medium'
    }
  ];
}

function createMockProjectFiles(): ProjectFile[] {
  const now = Date.now();
  return [
    {
      id: 'file-1',
      name: 'Fall_2024_Uniform_Concepts_v3.pdf',
      type: 'application/pdf',
      size: 2458000,
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      uploadedAt: new Date(now - 2 * 60 * 60 * 1000),
      hasComments: true,
      commentCount: 7,
      isLatestVersion: true,
      version: 'v3'
    },
    {
      id: 'file-2',
      name: 'Color_Palette_Options.png',
      type: 'image/png',
      size: 890000,
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      uploadedAt: new Date(now - 4 * 60 * 60 * 1000),
      hasComments: true,
      commentCount: 3,
      isLatestVersion: true,
      version: 'v1'
    },
    {
      id: 'file-3',
      name: 'Drill_Formation_Demo.mp4',
      type: 'video/mp4',
      size: 15600000,
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      uploadedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      hasComments: false,
      commentCount: 0,
      isLatestVersion: true,
      version: 'v1'
    }
  ];
}

// Default mock data - initialized once
export const mockProjectMilestones = createMockProjectMilestones();
export const mockProjectFiles = createMockProjectFiles();
