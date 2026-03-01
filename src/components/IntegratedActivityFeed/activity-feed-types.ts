export interface ActivityItem {
  id: string;
  type: 'message' | 'project_created' | 'project_updated' | 'file_upload' | 'conversation_created' |
        'review_completed' | 'milestone_reached' | 'user_joined' | 'status_change';
  title: string;
  description: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  context: {
    organizationId?: string;
    teamId?: string;
    projectId?: string;
    conversationId?: string;
    messageId?: string;
  };
  metadata?: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    oldValue?: string;
    newValue?: string;
    attachmentCount?: number;
    participants?: number;
  };
  actionable?: {
    label: string;
    action: () => void;
  };
}

export type ActivityFilter = 'all' | 'messages' | 'projects' | 'files' | 'reviews' | 'milestones';
