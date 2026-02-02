/**
 * WorkflowOrchestrator Component
 * Automated workflow management for design projects with AI-powered task coordination
 */

import { useState, useMemo } from 'react';
import {
  Play,
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Target,
  Sparkles,
  Brain,
  Workflow,
  Plus,
  Eye,
  Search,
  Download,
  Star,
  Timer,
  TrendingUp,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  type: 'design' | 'review' | 'approval' | 'feedback' | 'delivery' | 'meeting' | 'research';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: MessageUser;
  reviewers: MessageUser[];
  dependencies: string[];
  estimatedDuration: number; // minutes
  actualDuration?: number;
  dueDate: Date;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  blockedReason?: string;
  tags: string[];
  attachments: string[];
  conversationId?: string;
  projectId: string;
  parentTaskId?: string;
  subtasks: string[];
  automationTriggers: AutomationTrigger[];
  completionCriteria: CompletionCriteria[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'branding' | 'web_design' | 'print' | 'consultation' | 'custom';
  tasks: Omit<WorkflowTask, 'id' | 'projectId' | 'createdAt'>[];
  estimatedDuration: number; // total workflow duration in hours
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  rating: number;
  createdBy: MessageUser;
  lastModified: Date;
}

interface AutomationTrigger {
  id: string;
  type: 'time_based' | 'task_completion' | 'status_change' | 'message_received' | 'file_uploaded';
  condition: string;
  action: 'notify' | 'assign' | 'create_task' | 'send_message' | 'schedule_meeting' | 'generate_report';
  parameters: Record<string, any>;
  isActive: boolean;
}

interface CompletionCriteria {
  id: string;
  type: 'approval' | 'file_delivery' | 'feedback_received' | 'time_elapsed' | 'checklist';
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedBy?: MessageUser;
  completedAt?: Date;
}

interface WorkflowExecution {
  id: string;
  templateId?: string;
  projectId: string;
  title: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number; // 0-100
  tasks: WorkflowTask[];
  startDate: Date;
  endDate?: Date;
  estimatedCompletion: Date;
  actualCompletion?: Date;
  team: MessageUser[];
  lead: MessageUser;
  settings: WorkflowSettings;
  metrics: WorkflowMetrics;
}

interface WorkflowSettings {
  autoAssignment: boolean;
  smartScheduling: boolean;
  overdueAlerts: boolean;
  progressReports: boolean;
  clientNotifications: boolean;
  teamSync: boolean;
  qualityGates: boolean;
  automatedHandoffs: boolean;
}

interface WorkflowMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averageTaskDuration: number;
  teamEfficiency: number;
  clientSatisfaction: number;
  onTimeDelivery: number;
  bottlenecks: string[];
  recommendations: string[];
}

interface WorkflowOrchestratorProps {
  projectId: string;
  currentUser: MessageUser;
  className?: string;
  onTaskAssign?: (taskId: string, userId: string) => void;
  onWorkflowStart?: (workflowId: string) => void;
  onTaskComplete?: (taskId: string) => void;
}

// Mock workflow templates
const mockTemplates: WorkflowTemplate[] = [
  {
    id: 'template-1',
    name: 'Logo Design Process',
    description: 'Complete logo design workflow from brief to final delivery',
    category: 'branding',
    tasks: [
      {
        title: 'Initial Discovery Call',
        description: 'Understand client requirements and brand vision',
        type: 'meeting',
        status: 'pending',
        priority: 'high',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 60,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tags: ['discovery', 'consultation'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'Concept Development',
        description: 'Create initial logo concepts based on brief',
        type: 'design',
        status: 'pending',
        priority: 'high',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 240,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        tags: ['design', 'concepts'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'Client Review',
        description: 'Present concepts to client for feedback',
        type: 'review',
        status: 'pending',
        priority: 'medium',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 120,
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        tags: ['review', 'client'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'Refinement',
        description: 'Refine selected concept based on feedback',
        type: 'design',
        status: 'pending',
        priority: 'medium',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 180,
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        tags: ['refinement', 'iteration'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'Final Approval',
        description: 'Get final approval from client',
        type: 'approval',
        status: 'pending',
        priority: 'high',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 60,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tags: ['approval', 'final'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'File Delivery',
        description: 'Deliver final logo files in all required formats',
        type: 'delivery',
        status: 'pending',
        priority: 'high',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 90,
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        tags: ['delivery', 'files'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      }
    ],
    estimatedDuration: 16, // hours
    complexity: 'moderate',
    tags: ['logo', 'branding', 'design'],
    isPublic: true,
    usageCount: 127,
    rating: 4.8,
    createdBy: { id: 'sys', name: 'System', userType: 'admin' },
    lastModified: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: 'template-2',
    name: 'Website Design Sprint',
    description: 'Rapid website design process for small to medium projects',
    category: 'web_design',
    tasks: [
      {
        title: 'Wireframing',
        description: 'Create wireframes for key pages',
        type: 'design',
        status: 'pending',
        priority: 'high',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 300,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        tags: ['wireframes', 'ux'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'Visual Design',
        description: 'Apply visual design to wireframes',
        type: 'design',
        status: 'pending',
        priority: 'high',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 480,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        tags: ['visual', 'ui'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      },
      {
        title: 'Prototype Review',
        description: 'Review interactive prototype with client',
        type: 'review',
        status: 'pending',
        priority: 'medium',
        reviewers: [],
        dependencies: [],
        estimatedDuration: 90,
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        tags: ['prototype', 'review'],
        attachments: [],
        subtasks: [],
        automationTriggers: [],
        completionCriteria: []
      }
    ],
    estimatedDuration: 28,
    complexity: 'complex',
    tags: ['website', 'design', 'sprint'],
    isPublic: true,
    usageCount: 89,
    rating: 4.6,
    createdBy: { id: 'sys', name: 'System', userType: 'admin' },
    lastModified: new Date('2024-01-20T14:30:00Z')
  }
];

// Mock workflow execution
const mockExecution: WorkflowExecution = {
  id: 'exec-1',
  templateId: 'template-1',
  projectId: 'proj-1',
  title: 'Acme Corp Logo Design',
  status: 'active',
  progress: 65,
  tasks: [
    {
      id: 'task-1',
      title: 'Initial Discovery Call',
      description: 'Understand client requirements and brand vision',
      type: 'meeting',
      status: 'completed',
      priority: 'high',
      assignee: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
      reviewers: [],
      dependencies: [],
      estimatedDuration: 60,
      actualDuration: 45,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      tags: ['discovery', 'consultation'],
      attachments: [],
      projectId: 'proj-1',
      subtasks: [],
      automationTriggers: [],
      completionCriteria: []
    },
    {
      id: 'task-2',
      title: 'Concept Development',
      description: 'Create initial logo concepts based on brief',
      type: 'design',
      status: 'completed',
      priority: 'high',
      assignee: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
      reviewers: [],
      dependencies: ['task-1'],
      estimatedDuration: 240,
      actualDuration: 220,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      tags: ['design', 'concepts'],
      attachments: ['concept-v1.png', 'concept-v2.png'],
      projectId: 'proj-1',
      subtasks: [],
      automationTriggers: [],
      completionCriteria: []
    },
    {
      id: 'task-3',
      title: 'Client Review',
      description: 'Present concepts to client for feedback',
      type: 'review',
      status: 'in_progress',
      priority: 'medium',
      assignee: { id: 'u2', name: 'John Client', userType: 'client', avatar: '/mock/john.jpg' },
      reviewers: [{ id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' }],
      dependencies: ['task-2'],
      estimatedDuration: 120,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      tags: ['review', 'client'],
      attachments: [],
      projectId: 'proj-1',
      subtasks: [],
      automationTriggers: [],
      completionCriteria: []
    }
  ],
  startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  team: [
    { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
    { id: 'u2', name: 'John Client', userType: 'client', avatar: '/mock/john.jpg' }
  ],
  lead: { id: 'u1', name: 'Sarah Designer', userType: 'designer', avatar: '/mock/sarah.jpg' },
  settings: {
    autoAssignment: true,
    smartScheduling: true,
    overdueAlerts: true,
    progressReports: true,
    clientNotifications: true,
    teamSync: true,
    qualityGates: true,
    automatedHandoffs: true
  },
  metrics: {
    totalTasks: 6,
    completedTasks: 2,
    overdueTasks: 0,
    averageTaskDuration: 132.5,
    teamEfficiency: 92,
    clientSatisfaction: 4.8,
    onTimeDelivery: 100,
    bottlenecks: ['Client feedback delay'],
    recommendations: ['Schedule regular check-ins with client', 'Set up automated reminders']
  }
};

export function WorkflowOrchestrator({
  projectId: _projectId,
  currentUser: _currentUser,
  className,
  onTaskAssign: _onTaskAssign,
  onWorkflowStart,
  onTaskComplete
}: WorkflowOrchestratorProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'execution' | 'analytics'>('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [execution, _setExecution] = useState<WorkflowExecution>(mockExecution);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'blocked'>('all');

  const filteredTasks = useMemo(() => {
    return execution.tasks.filter(task => {
      const matchesSearch = searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [execution.tasks, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'design': return FileText;
      case 'review': return Eye;
      case 'approval': return CheckCircle;
      case 'feedback': return MessageSquare;
      case 'delivery': return Download;
      case 'meeting': return Calendar;
      case 'research': return Brain;
      default: return Target;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const TaskCard = ({ task }: { task: WorkflowTask }) => {
    const Icon = getTaskIcon(task.type);
    const isOverdue = task.dueDate < new Date() && task.status !== 'completed';

    return (
      <Card className={cn(
        "mb-4 transition-all duration-200 hover:shadow-md",
        isOverdue && "border-red-300 bg-red-50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              task.status === 'completed' ? "bg-green-100 text-green-600" :
              task.status === 'in_progress' ? "bg-blue-100 text-blue-600" :
              task.status === 'blocked' ? "bg-red-100 text-red-600" :
              "bg-gray-100 text-gray-600"
            )}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-lg">{task.title}</h4>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{task.description}</p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {task.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-gray-600">{task.assignee.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(task.estimatedDuration)}</span>
                  </div>

                  {isOverdue && (
                    <Badge variant="error" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    Due: {task.dueDate.toLocaleDateString()}
                  </span>
                  {task.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => onTaskComplete?.(task.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              </div>

              {task.tags.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TemplateCard = ({ template }: { template: WorkflowTemplate }) => (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        selectedTemplate === template.id && "border-blue-500 bg-blue-50"
      )}
      onClick={() => setSelectedTemplate(template.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-1">{template.name}</h4>
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {template.estimatedDuration}h
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {template.tasks.length} tasks
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {template.usageCount} uses
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                {template.rating}
              </span>
            </div>
          </div>

          <Badge className={cn(
            template.complexity === 'simple' ? 'bg-green-100 text-green-800' :
            template.complexity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          )}>
            {template.complexity}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onWorkflowStart?.(template.id);
            }}
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MetricsCard = ({ title, value, icon: Icon, color, change }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    change?: number;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <p className={cn(
                "text-sm flex items-center gap-1 mt-1",
                change >= 0 ? "text-green-600" : "text-red-600"
              )}>
                <TrendingUp className="w-3 h-3" />
                {change >= 0 ? '+' : ''}{change}% from last period
              </p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", color)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <Card className="border-b rounded-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Workflow className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Workflow Orchestrator</CardTitle>
                <p className="text-sm text-gray-500">
                  AI-powered project workflow automation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Active
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
        <div className="border-b">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="execution">Active Workflows</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="h-full m-0">
            <div className="p-6 h-full overflow-auto">
              {/* Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricsCard
                  title="Active Tasks"
                  value={execution.metrics.totalTasks - execution.metrics.completedTasks}
                  icon={Target}
                  color="bg-blue-100 text-blue-600"
                  change={12}
                />
                <MetricsCard
                  title="Completion Rate"
                  value={`${Math.round((execution.metrics.completedTasks / execution.metrics.totalTasks) * 100)}%`}
                  icon={CheckCircle}
                  color="bg-green-100 text-green-600"
                  change={8}
                />
                <MetricsCard
                  title="Team Efficiency"
                  value={`${execution.metrics.teamEfficiency}%`}
                  icon={TrendingUp}
                  color="bg-purple-100 text-purple-600"
                  change={5}
                />
                <MetricsCard
                  title="Avg. Task Duration"
                  value={formatDuration(execution.metrics.averageTaskDuration)}
                  icon={Timer}
                  color="bg-orange-100 text-orange-600"
                  change={-15}
                />
              </div>

              {/* Current Workflow Progress */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    {execution.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium">{execution.progress}%</span>
                    </div>
                    <Progress value={execution.progress} className="h-2" />

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium ml-2">{execution.metrics.completedTasks}/{execution.metrics.totalTasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Due:</span>
                        <span className="font-medium ml-2">{execution.estimatedCompletion.toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Team:</span>
                        <span className="font-medium ml-2">{execution.team.length} members</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Tasks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Tasks</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('execution')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {execution.tasks.slice(0, 3).map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="h-full m-0">
            <div className="p-6 h-full overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Workflow Templates</h3>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mockTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution" className="h-full m-0">
            <div className="p-6 h-full overflow-auto">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Task List */}
              <div className="space-y-4">
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="h-full m-0">
            <div className="p-6 h-full overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Team Efficiency</span>
                      <div className="flex items-center gap-2">
                        <Progress value={execution.metrics.teamEfficiency} className="w-20" />
                        <span className="text-sm font-medium">{execution.metrics.teamEfficiency}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>On-time Delivery</span>
                      <div className="flex items-center gap-2">
                        <Progress value={execution.metrics.onTimeDelivery} className="w-20" />
                        <span className="text-sm font-medium">{execution.metrics.onTimeDelivery}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Client Satisfaction</span>
                      <div className="flex items-center gap-2">
                        <Progress value={execution.metrics.clientSatisfaction * 20} className="w-20" />
                        <span className="text-sm font-medium">{execution.metrics.clientSatisfaction}/5</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bottlenecks & Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-red-600">Bottlenecks</h4>
                      <ul className="space-y-1">
                        {execution.metrics.bottlenecks.map((bottleneck, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            {bottleneck}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-sm mb-2 text-blue-600">Recommendations</h4>
                      <ul className="space-y-1">
                        {execution.metrics.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default WorkflowOrchestrator;