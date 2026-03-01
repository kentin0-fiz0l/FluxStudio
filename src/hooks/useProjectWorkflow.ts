import { useState } from 'react';
import type { Milestone, Project } from '../components/project/workflow/types';

interface UseProjectWorkflowParams {
  project: Project;
  onProjectUpdate?: (project: Project) => void;
  onMilestoneUpdate?: (milestone: Milestone) => void;
  isEditable?: boolean;
}

export function useProjectWorkflow({
  project,
  onProjectUpdate,
  onMilestoneUpdate,
  isEditable = false
}: UseProjectWorkflowParams) {
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones || []);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);

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

      setMilestones(prev =>
        prev.map(m => m.id === milestone.id ? updatedMilestone : m)
      );

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

  // Handle editing a milestone inline (used from the milestone list)
  const saveMilestoneEdit = (milestoneId: string, updatedData: Partial<Milestone>) => {
    const original = milestones.find(m => m.id === milestoneId);
    if (!original) return;

    setMilestones(prev =>
      prev.map(m => m.id === milestoneId ? { ...m, ...updatedData } : m)
    );
    setEditingMilestone(null);

    if (onMilestoneUpdate) {
      onMilestoneUpdate({ ...original, ...updatedData });
    }
  };

  return {
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
  };
}
