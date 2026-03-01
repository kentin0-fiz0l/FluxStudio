import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
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
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { cn } from '../../lib/utils';

import type { ProjectWorkflowProps } from './workflow/types';
import { statusConfig, priorityConfig } from './workflow/constants';
import { ProjectEditForm } from './workflow/ProjectEditForm';
import { MilestoneForm } from './workflow/MilestoneForm';
import { useProjectWorkflow } from '../../hooks/useProjectWorkflow';

export function ProjectWorkflow({
  project,
  onProjectUpdate,
  onMilestoneUpdate,
  isEditable = false
}: ProjectWorkflowProps) {
  const {
    milestones,
    isEditingProject,
    setIsEditingProject,
    editingMilestone,
    setEditingMilestone,
    isCreatingMilestone,
    setIsCreatingMilestone,
    completedMilestones,
    totalMilestones,
    progress,
    toggleMilestoneCompletion,
    updateProjectStatus,
    createMilestone,
    saveMilestoneEdit,
    formatDate,
    isOverdue
  } = useProjectWorkflow({ project, onProjectUpdate, onMilestoneUpdate, isEditable });

  const statusInfo = statusConfig[project.status];
  const priorityInfo = priorityConfig[project.priority];
  const StatusIcon = statusInfo.icon;

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
                                  saveMilestoneEdit(milestone.id, updatedMilestone);
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

export default ProjectWorkflow;
