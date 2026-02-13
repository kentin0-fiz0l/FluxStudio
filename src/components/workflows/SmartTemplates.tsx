/**
 * Smart Templates Component
 * Pre-built workflow templates for common use cases
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Settings,
  FileText,
  Users,
  MessageSquare,
  Folder,
  TrendingUp,
  Search,
  Star,
  Edit,
  Plus
} from 'lucide-react';
import { useWorkspace } from '@/store';
import { useAuth } from '../../contexts/AuthContext';
import { workflowEngine, WorkflowTemplate, WorkflowInstance } from '../../services/workflowEngine';
import { cn } from '../../lib/utils';

interface SmartTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'project' | 'communication' | 'design' | 'review' | 'automation';
  estimatedTime: string;
  popularity: number;
  tags: string[];
  requiredRole?: string;
  template: WorkflowTemplate;
}

export function SmartTemplates() {
  const { state, actions } = useWorkspace();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SmartTemplate | null>(null);
  const [runningWorkflows, setRunningWorkflows] = useState<Map<string, WorkflowInstance>>(new Map());
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

  // Pre-built smart templates
  const smartTemplates: SmartTemplate[] = [
    {
      id: 'quick-project-setup',
      name: 'Quick Project Setup',
      description: 'Set up a new project with team, folders, and communication channels in minutes',
      icon: Folder,
      category: 'project',
      estimatedTime: '5 mins',
      popularity: 95,
      tags: ['setup', 'onboarding', 'automation'],
      template: workflowEngine['templates'].get('project-kickoff')!
    },
    {
      id: 'design-review-cycle',
      name: 'Design Review Cycle',
      description: 'Automated review process with client feedback and approval tracking',
      icon: CheckCircle,
      category: 'review',
      estimatedTime: '2-3 days',
      popularity: 88,
      tags: ['review', 'approval', 'client'],
      template: workflowEngine['templates'].get('design-review')!
    },
    {
      id: 'client-onboarding',
      name: 'Client Onboarding',
      description: 'Welcome new clients with automated workspace setup and resource sharing',
      icon: Users,
      category: 'communication',
      estimatedTime: '10 mins',
      popularity: 92,
      tags: ['onboarding', 'client', 'welcome'],
      template: workflowEngine['templates'].get('client-onboarding')!
    },
    {
      id: 'weekly-status-update',
      name: 'Weekly Status Update',
      description: 'Automated weekly progress reports and team sync',
      icon: TrendingUp,
      category: 'communication',
      estimatedTime: '15 mins',
      popularity: 76,
      tags: ['reporting', 'status', 'team'],
      template: {
        id: 'weekly-status',
        name: 'Weekly Status Update',
        description: 'Automated weekly reporting',
        category: 'communication',
        triggers: [{
          type: 'schedule',
          config: { schedule: '0 9 * * 1' } // Every Monday at 9am
        }],
        steps: [],
        variables: {}
      }
    },
    {
      id: 'design-handoff',
      name: 'Design Handoff',
      description: 'Streamline design-to-development handoff with asset preparation',
      icon: FileText,
      category: 'design',
      estimatedTime: '30 mins',
      popularity: 81,
      tags: ['handoff', 'development', 'assets'],
      template: {
        id: 'design-handoff',
        name: 'Design Handoff',
        description: 'Design to development transition',
        category: 'project',
        triggers: [{ type: 'manual', config: {} }],
        steps: [],
        variables: {}
      }
    },
    {
      id: 'milestone-celebration',
      name: 'Milestone Celebration',
      description: 'Automatically celebrate project milestones with team notifications',
      icon: Star,
      category: 'automation',
      estimatedTime: '2 mins',
      popularity: 70,
      tags: ['milestone', 'team', 'celebration'],
      template: {
        id: 'milestone-celebration',
        name: 'Milestone Celebration',
        description: 'Celebrate achievements',
        category: 'project',
        triggers: [{ type: 'event', config: { eventName: 'milestone.reached' } }],
        steps: [],
        variables: {}
      }
    }
  ];

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return smartTemplates.filter(template => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = !template.requiredRole || template.requiredRole === user?.userType;

      return matchesCategory && matchesSearch && matchesRole;
    });
  }, [selectedCategory, searchQuery, smartTemplates, user]);

  const startWorkflow = async (template: SmartTemplate) => {
    try {
      const context = {
        project: state.activeProject || undefined,
        conversation: state.activeConversation || undefined,
        organization: state.activeOrganization || undefined,
        team: state.activeTeam || undefined,
        user: {
          id: user?.id || '',
          name: user?.name || '',
          email: user?.email || '',
          userType: user?.userType || 'client',
          avatar: user?.avatar,
        },
        variables: {}
      } as import('@/services/workflowEngine').WorkflowContext;

      const instance = await workflowEngine.startWorkflow(template.template.id, context);
      setRunningWorkflows(new Map(runningWorkflows.set(instance.id, instance)));

      // Show notification
      actions.addActivity({
        type: 'automation_enabled',
        title: `Started ${template.name}`,
        description: `Workflow is now running`,
        userId: user?.id || '',
        userName: user?.name || ''
      });
    } catch (error: unknown) {
      console.error('Failed to start workflow:', error);
    }
  };

  const getStatusBadge = (instance: WorkflowInstance) => {
    const statusConfig = {
      running: { label: 'Running', variant: 'default' as const, icon: Play },
      completed: { label: 'Completed', variant: 'success' as const, icon: CheckCircle },
      failed: { label: 'Failed', variant: 'error' as const, icon: XCircle },
      cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: XCircle },
      pending: { label: 'Pending', variant: 'outline' as const, icon: Clock }
    };

    const config = statusConfig[instance.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const categoryIcons = {
    all: Zap,
    project: Folder,
    communication: MessageSquare,
    design: FileText,
    review: CheckCircle,
    automation: Settings
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Templates</h2>
          <p className="text-gray-600 mt-1">Pre-built workflows to automate common tasks</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Create Custom
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {Object.entries(categoryIcons).map(([category, Icon]) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              <Icon size={14} className="mr-1" />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          const isRunning = Array.from(runningWorkflows.values()).some(
            w => w.templateId === template.template.id && w.status === 'running'
          );

          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                isRunning && "ring-2 ring-blue-500"
              )}
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      template.category === 'project' && "bg-blue-100 text-blue-600",
                      template.category === 'communication' && "bg-green-100 text-green-600",
                      template.category === 'design' && "bg-purple-100 text-purple-600",
                      template.category === 'review' && "bg-orange-100 text-orange-600",
                      template.category === 'automation' && "bg-gray-100 text-gray-600"
                    )}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ~{template.estimatedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isRunning && (
                    <Badge variant="default" className="animate-pulse">
                      Running
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    {template.popularity}%
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      startWorkflow(template);
                    }}
                  >
                    <Play size={14} className="mr-1" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setShowCustomizeDialog(true);
                    }}
                  >
                    <Edit size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Running Workflows */}
      {runningWorkflows.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock size={18} />
              Running Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(runningWorkflows.values()).map(instance => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {smartTemplates.find(t => t.template.id === instance.templateId)?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Started {new Date(instance.startedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(instance)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => workflowEngine.cancelWorkflow(instance.id)}
                    >
                      <XCircle size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customize Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Template</DialogTitle>
            <DialogDescription>
              Adjust the template settings before starting the workflow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTemplate && (
              <>
                <div>
                  <Label>Template Name</Label>
                  <Input defaultValue={selectedTemplate.name} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input defaultValue={selectedTemplate.description} />
                </div>
                <div>
                  <Label>Trigger Type</Label>
                  <select className="w-full p-2 border rounded">
                    <option>Manual</option>
                    <option>On Project Creation</option>
                    <option>On Schedule</option>
                    <option>On Event</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedTemplate) {
                startWorkflow(selectedTemplate);
                setShowCustomizeDialog(false);
              }
            }}>
              Start Customized Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SmartTemplates;