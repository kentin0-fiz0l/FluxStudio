import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  FileText,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  PlayCircle,
  PauseCircle,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/store/slices/authSlice';
import { cn } from '../../lib/utils';

interface Milestone {
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

interface Project {
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

interface ProjectWorkflowProps {
  project: Project;
  onProjectUpdate?: (project: Project) => void;
  onMilestoneUpdate?: (milestone: Milestone) => void;
  isEditable?: boolean;
}

const statusConfig = {
  planning: {
    label: 'Planning',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: Clock
  },
  active: {
    label: 'Active',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: PlayCircle
  },
  'on-hold': {
    label: 'On Hold',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: PauseCircle
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: RotateCcw
  }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-blue-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500' }
};

export function ProjectWorkflow({
  project,
  onProjectUpdate,
  onMilestoneUpdate,
  isEditable = false
}: ProjectWorkflowProps) {
  const { user: _user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones || []);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);

  const statusInfo = statusConfig[project.status];
  const priorityInfo = priorityConfig[project.priority];
  const StatusIcon = statusInfo.icon;

  // Calculate project progress
  const completedMilestones = milestones.filter(m => m.completed_at).length;
  const totalMilestones = milestones.length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  // Handle milestone completion toggle
  const toggleMilestoneCompletion = async (milestone: Milestone) => {
    if (!isEditable) return;

    try {
      const updatedMilestone: Milestone = {
        ...milestone,
        completed_at: milestone.completed_at ? undefined : new Date().toISOString()
      };

      // Update local state
      setMilestones(prev =>
        prev.map(m => m.id === milestone.id ? updatedMilestone : m)
      );

      // Call API to update milestone
      if (onMilestoneUpdate) {
        onMilestoneUpdate(updatedMilestone);
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  // Handle project status change
  const updateProjectStatus = async (newStatus: Project['status']) => {
    if (!isEditable) return;

    try {
      const updatedProject = {
        ...project,
        status: newStatus,
        completion_date: newStatus === 'completed' ? new Date().toISOString() : project.completion_date
      };

      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  // Create new milestone
  const createMilestone = async (milestoneData: Partial<Milestone>) => {
    try {
      const newMilestone: Milestone = {
        id: `milestone-${Date.now()}`,
        name: milestoneData.name || '',
        description: milestoneData.description || '',
        due_date: milestoneData.due_date,
        assigned_to: milestoneData.assigned_to,
        order_index: milestones.length,
        is_required: milestoneData.is_required || true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setMilestones(prev => [...prev, newMilestone]);
      setIsCreatingMilestone(false);

      if (onMilestoneUpdate) {
        onMilestoneUpdate(newMilestone);
      }
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if date is overdue
  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date() && project.status !== 'completed';
  };

  return (
    <div className="space-y-6">
      {/* Project Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', statusInfo.bgColor)}>
                <StatusIcon className={cn('h-5 w-5', statusInfo.textColor)} aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-white', priorityInfo.color)}>
                {priorityInfo.label} Priority
              </Badge>
              <Badge variant="outline" className={statusInfo.textColor}>
                {statusInfo.label}
              </Badge>
              {isEditable && (
                <Dialog open={isEditingProject} onOpenChange={setIsEditingProject}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4 mr-2" aria-hidden="true" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Project</DialogTitle>
                      <DialogDescription>
                        Update project details and status
                      </DialogDescription>
                    </DialogHeader>
                    <ProjectEditForm
                      project={project}
                      onSave={(updatedProject) => {
                        if (onProjectUpdate) onProjectUpdate(updatedProject);
                        setIsEditingProject(false);
                      }}
                      onCancel={() => setIsEditingProject(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Start Date</div>
              <div className="font-medium">{formatDate(project.start_date)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Due Date</div>
              <div className={cn(
                'font-medium',
                isOverdue(project.due_date) ? 'text-red-600' : ''
              )}>
                {formatDate(project.due_date)}
                {isOverdue(project.due_date) && (
                  <AlertCircle className="h-4 w-4 inline ml-1 text-red-500" aria-hidden="true" />
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Progress</div>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="flex-1" />
                <span className="text-sm font-medium">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalMilestones}</div>
              <div className="text-sm text-gray-500">Total Milestones</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalMilestones - completedMilestones}</div>
              <div className="text-sm text-gray-500">Remaining</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {project.due_date ? Math.max(0, Math.ceil((new Date(project.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '—'}
              </div>
              <div className="text-sm text-gray-500">Days Left</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Milestones</CardTitle>
              <CardDescription>Track progress through key project phases</CardDescription>
            </div>
            {isEditable && (
              <Dialog open={isCreatingMilestone} onOpenChange={setIsCreatingMilestone}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Milestone</DialogTitle>
                    <DialogDescription>
                      Create a new milestone for this project
                    </DialogDescription>
                  </DialogHeader>
                  <MilestoneForm
                    milestone={null}
                    onSave={createMilestone}
                    onCancel={() => setIsCreatingMilestone(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <AnimatePresence>
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border-2 transition-all',
                    milestone.completed_at
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  {/* Milestone Status */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => toggleMilestoneCompletion(milestone)}
                      disabled={!isEditable}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                        milestone.completed_at
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-400',
                        !isEditable && 'cursor-default'
                      )}
                    >
                      {milestone.completed_at && <CheckCircle className="h-4 w-4" aria-hidden="true" />}
                    </button>
                    {index < milestones.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Milestone Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={cn(
                          'font-medium text-gray-900',
                          milestone.completed_at && 'line-through text-gray-500'
                        )}>
                          {milestone.name}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {milestone.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" aria-hidden="true" />
                              <span className={cn(
                                isOverdue(milestone.due_date) && !milestone.completed_at
                                  ? 'text-red-600 font-medium'
                                  : ''
                              )}>
                                {formatDate(milestone.due_date)}
                              </span>
                            </div>
                          )}
                          {milestone.assigned_to && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" aria-hidden="true" />
                              <span>Assigned to {milestone.assigned_to}</span>
                            </div>
                          )}
                          {milestone.completed_at && (
                            <div className="text-green-600 font-medium">
                              Completed {formatDate(milestone.completed_at)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Milestone Actions */}
                      {isEditable && (
                        <div className="flex items-center gap-1 ml-4">
                          <Dialog open={editingMilestone?.id === milestone.id} onOpenChange={(open) => {
                            if (!open) setEditingMilestone(null);
                            else setEditingMilestone(milestone);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit3 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Milestone</DialogTitle>
                                <DialogDescription>
                                  Update milestone details and timeline
                                </DialogDescription>
                              </DialogHeader>
                              <MilestoneForm
                                milestone={milestone}
                                onSave={(updatedMilestone) => {
                                  setMilestones(prev =>
                                    prev.map(m => m.id === milestone.id ? { ...milestone, ...updatedMilestone } : m)
                                  );
                                  setEditingMilestone(null);
                                  if (onMilestoneUpdate) {
                                    onMilestoneUpdate({ ...milestone, ...updatedMilestone });
                                  }
                                }}
                                onCancel={() => setEditingMilestone(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {milestones.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                <h3 className="font-medium text-gray-900 mb-1">No milestones yet</h3>
                <p className="text-sm">Add milestones to track project progress</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common project management actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => updateProjectStatus('active')}
                disabled={project.status === 'active'}
              >
                <PlayCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Start Project
              </Button>
              <Button
                variant="outline"
                onClick={() => updateProjectStatus('on-hold')}
                disabled={project.status === 'on-hold'}
              >
                <PauseCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Put on Hold
              </Button>
              <Button
                variant="outline"
                onClick={() => updateProjectStatus('completed')}
                disabled={project.status === 'completed'}
              >
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Mark Complete
              </Button>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                Send Update
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Project Edit Form Component
function ProjectEditForm({
  project,
  onSave,
  onCancel
}: {
  project: Project;
  onSave: (project: Project) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
    priority: project.priority,
    start_date: project.start_date || '',
    due_date: project.due_date || ''
  });

  const handleSave = () => {
    onSave({
      ...project,
      ...formData
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Project Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter project name"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter project description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Project['status'] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Priority</label>
          <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Project['priority'] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}

// Milestone Form Component
function MilestoneForm({
  milestone,
  onSave,
  onCancel
}: {
  milestone: Milestone | null;
  onSave: (milestone: Partial<Milestone>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: milestone?.name || '',
    description: milestone?.description || '',
    due_date: milestone?.due_date || '',
    assigned_to: milestone?.assigned_to || '',
    is_required: milestone?.is_required ?? true
  });

  const handleSave = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Milestone Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter milestone name"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter milestone description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Assigned To</label>
          <Input
            value={formData.assigned_to}
            onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
            placeholder="Enter assignee name"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!formData.name.trim()}>
          {milestone ? 'Update' : 'Create'} Milestone
        </Button>
      </div>
    </div>
  );
}
export default ProjectWorkflow;
