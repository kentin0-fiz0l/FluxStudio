import { DesignReview, MessageUser } from '../../../types/messaging';

export interface DesignVersion {
  id: string;
  version: string;
  uploadedAt: Date;
  uploadedBy: MessageUser;
  changes: string[];
  isActive: boolean;
  fileUrl: string;
  thumbnail: string;
}

// Factory functions to create mock data with fresh dates
export function createMockDesignReview(): DesignReview {
  const now = Date.now();
  return {
    id: 'review-1',
    messageId: 'msg-1',
    fileId: 'file-1',
    projectId: 'project-1',
    reviewType: 'initial',
    status: 'in_review',
    reviewer: { id: 'client-1', name: 'Director Johnson', userType: 'client', avatar: '/avatars/director.jpg' },
    assignedTo: [
      { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
    ],
    feedback: {
      overall: '',
      annotations: [],
      suggestions: [],
      approved: false
    },
    deadline: new Date(now + 48 * 60 * 60 * 1000), // 48 hours from now
    createdAt: new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago
  };
}

export function createMockDesignVersions(): DesignVersion[] {
  const now = Date.now();
  return [
    {
      id: 'version-3',
      version: 'v3.0',
      uploadedAt: new Date(now - 1 * 60 * 60 * 1000),
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      changes: ['Updated color scheme based on feedback', 'Adjusted logo placement', 'Refined typography'],
      isActive: true,
      fileUrl: '/designs/uniform-v3.jpg',
      thumbnail: '/thumbnails/uniform-v3-thumb.jpg'
    },
    {
      id: 'version-2',
      version: 'v2.1',
      uploadedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      changes: ['Initial client feedback integration', 'Color variations added'],
      isActive: false,
      fileUrl: '/designs/uniform-v2.jpg',
      thumbnail: '/thumbnails/uniform-v2-thumb.jpg'
    },
    {
      id: 'version-1',
      version: 'v1.0',
      uploadedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      changes: ['Initial concept'],
      isActive: false,
      fileUrl: '/designs/uniform-v1.jpg',
      thumbnail: '/thumbnails/uniform-v1-thumb.jpg'
    }
  ];
}

export const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];
