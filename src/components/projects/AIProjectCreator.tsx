/**
 * AIProjectCreator - AI-powered project creation with scaffolding
 *
 * User describes their project in natural language → AI generates:
 * - Suggested project name
 * - Folder structure
 * - Initial tasks with timeline
 * - Recommended team roles
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Folder,
  CheckSquare,
  Users,
  Calendar,
  ArrowRight,
  Loader2,
  Check,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface AISuggestion {
  name: string;
  folders: string[];
  tasks: Array<{
    title: string;
    week: number;
    description?: string;
  }>;
  teamRoles: string[];
}

interface AIProjectCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
}

export function AIProjectCreator({
  open,
  onOpenChange,
  onProjectCreated,
}: AIProjectCreatorProps) {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState({
    name: false,
    folders: false,
    tasks: false,
  });

  const generateSuggestions = useCallback(async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    try {
      // Call AI API to generate suggestions
      const response = await fetch('/api/ai/generate-project-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ description: description.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      } else {
        // Fallback to local generation if API fails
        setSuggestions(generateLocalSuggestions(description));
      }
    } catch (_error) {
      // Fallback to local generation
      setSuggestions(generateLocalSuggestions(description));
    } finally {
      setIsGenerating(false);
    }
  }, [description]);

  // Local fallback suggestion generator
  const generateLocalSuggestions = (desc: string): AISuggestion => {
    const lowerDesc = desc.toLowerCase();

    // Detect project type and generate appropriate suggestions
    if (lowerDesc.includes('march') || lowerDesc.includes('band') || lowerDesc.includes('show')) {
      return {
        name: 'Marching Band Show 2025',
        folders: ['Music & Audio', 'Formations & Drill', 'Costumes & Uniforms', 'Props & Equipment', 'Reference Materials'],
        tasks: [
          { title: 'Select show theme and music', week: 1, description: 'Choose concept and music selections' },
          { title: 'Draft initial drill design', week: 2, description: 'Create formation charts' },
          { title: 'Finalize music arrangements', week: 3, description: 'Complete all musical edits' },
          { title: 'Design costume concepts', week: 4, description: 'Create uniform mockups' },
          { title: 'Props design and ordering', week: 5, description: 'Design and source props' },
          { title: 'Begin ensemble rehearsals', week: 6, description: 'Start teaching drill and music' },
        ],
        teamRoles: ['Show Designer', 'Music Arranger', 'Drill Writer', 'Costume Designer', 'Props Coordinator'],
      };
    }

    if (lowerDesc.includes('website') || lowerDesc.includes('web') || lowerDesc.includes('redesign')) {
      return {
        name: 'Website Redesign Project',
        folders: ['Design Assets', 'Wireframes', 'UI Components', 'Content', 'Documentation'],
        tasks: [
          { title: 'Discovery and research', week: 1, description: 'Stakeholder interviews and competitive analysis' },
          { title: 'Information architecture', week: 2, description: 'Site map and content structure' },
          { title: 'Wireframe key pages', week: 3, description: 'Low-fidelity wireframes' },
          { title: 'Visual design system', week: 4, description: 'Colors, typography, components' },
          { title: 'High-fidelity mockups', week: 5, description: 'Final design deliverables' },
          { title: 'Developer handoff', week: 6, description: 'Specs and asset export' },
        ],
        teamRoles: ['Project Lead', 'UX Designer', 'UI Designer', 'Content Strategist', 'Developer'],
      };
    }

    // Default generic project
    return {
      name: 'New Creative Project',
      folders: ['Planning', 'Design', 'Assets', 'Deliverables', 'Archive'],
      tasks: [
        { title: 'Project kickoff', week: 1, description: 'Define goals and requirements' },
        { title: 'Research and discovery', week: 2, description: 'Gather information and inspiration' },
        { title: 'Initial concepts', week: 3, description: 'Create first drafts' },
        { title: 'Refinement', week: 4, description: 'Iterate based on feedback' },
        { title: 'Finalization', week: 5, description: 'Complete all deliverables' },
        { title: 'Review and delivery', week: 6, description: 'Final review and handoff' },
      ],
      teamRoles: ['Project Lead', 'Designer', 'Contributor', 'Reviewer'],
    };
  };

  const handleApplyName = () => {
    if (suggestions) {
      setProjectName(suggestions.name);
      setAppliedSuggestions((prev) => ({ ...prev, name: true }));
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          description: description.trim(),
          folders: appliedSuggestions.folders ? suggestions?.folders : undefined,
          tasks: appliedSuggestions.tasks ? suggestions?.tasks : undefined,
          status: 'planning',
          priority: 'medium',
        }),
      });

      if (response.ok) {
        const { data: project } = await response.json();
        onOpenChange(false);
        if (onProjectCreated) {
          onProjectCreated(project.id);
        } else {
          navigate(`/projects/${project.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setDescription('');
    setProjectName('');
    setSuggestions(null);
    setAppliedSuggestions({ name: false, folders: false, tasks: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary-600" aria-hidden="true" />
            Create Project with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Describe your project
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Design a marching band show with a space exploration theme for our summer competition..."
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={generateSuggestions}
                disabled={!description.trim() || isGenerating}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Suggestions'}
              </Button>
            </div>
          </div>

          {/* AI Suggestions */}
          <AnimatePresence>
            {suggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-primary-200 dark:border-primary-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary-600" aria-hidden="true" />
                      AI Suggestions
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateSuggestions}
                        className="ml-auto h-6 w-6 p-0"
                        title="Regenerate"
                      >
                        <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {/* Suggested Name */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-700 dark:text-neutral-300">
                          Suggested Name
                        </p>
                        <p className="text-neutral-900 dark:text-white">
                          {suggestions.name}
                        </p>
                      </div>
                      <Button
                        variant={appliedSuggestions.name ? 'primary' : 'outline'}
                        size="sm"
                        onClick={handleApplyName}
                        className="gap-1"
                      >
                        {appliedSuggestions.name ? (
                          <Check className="w-3 h-3" aria-hidden="true" />
                        ) : null}
                        {appliedSuggestions.name ? 'Applied' : 'Use This'}
                      </Button>
                    </div>

                    {/* Suggested Folders */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                          <Folder className="w-4 h-4" aria-hidden="true" />
                          Suggested Folders
                        </p>
                        <Button
                          variant={appliedSuggestions.folders ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setAppliedSuggestions((prev) => ({
                              ...prev,
                              folders: !prev.folders,
                            }))
                          }
                          className="gap-1"
                        >
                          {appliedSuggestions.folders ? (
                            <Check className="w-3 h-3" aria-hidden="true" />
                          ) : null}
                          {appliedSuggestions.folders ? 'Applied' : 'Create Folders'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.folders.map((folder) => (
                          <Badge key={folder} variant="secondary" size="sm">
                            {folder}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Tasks */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                          <CheckSquare className="w-4 h-4" aria-hidden="true" />
                          Suggested Timeline
                        </p>
                        <Button
                          variant={appliedSuggestions.tasks ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setAppliedSuggestions((prev) => ({
                              ...prev,
                              tasks: !prev.tasks,
                            }))
                          }
                          className="gap-1"
                        >
                          {appliedSuggestions.tasks ? (
                            <Check className="w-3 h-3" aria-hidden="true" />
                          ) : null}
                          {appliedSuggestions.tasks ? 'Applied' : 'Create Tasks'}
                        </Button>
                      </div>
                      <ul className="space-y-1">
                        {suggestions.tasks.slice(0, 4).map((task, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400"
                          >
                            <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                            <span>
                              Week {task.week}: {task.title}
                            </span>
                          </li>
                        ))}
                        {suggestions.tasks.length > 4 && (
                          <li className="text-neutral-500 text-xs">
                            +{suggestions.tasks.length - 4} more tasks
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Team Roles */}
                    <div>
                      <p className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4" aria-hidden="true" />
                        Suggested Team Roles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.teamRoles.map((role) => (
                          <Badge key={role} variant="outline" size="sm">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Project Name Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Project Name
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="text-lg"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="ghost" onClick={handleReset}>
              Start Over
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                )}
                Create Project
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AIProjectCreator;
