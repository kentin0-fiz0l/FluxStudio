export interface Milestone {
  id: string;
  name: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
  assigned_to?: string;
  order_index: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_type: string;
  service_category: string;
  service_tier: string;
  start_date?: string;
  due_date?: string;
  completion_date?: string;
  milestones?: Milestone[];
  progress?: number;
}

export interface ProjectWorkflowProps {
  project: Project;
  onProjectUpdate?: (project: Project) => void;
  onMilestoneUpdate?: (milestone: Milestone) => void;
  isEditable?: boolean;
}
