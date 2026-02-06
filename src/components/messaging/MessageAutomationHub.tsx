/**
 * Message Automation Hub
 * Scheduling, templates, workflows, and AI-powered automation for messaging
 */

import { useState, useEffect } from 'react';
import {
  Clock,
  Zap,
  Bot,
  MessageSquare,
  Pause,
  Edit,
  Trash2,
  Plus,
  Users,
  CheckCircle,
  RotateCcw,
  TrendingUp,
  FileText,
  Heart,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { MessageType, Priority, Conversation } from '../../types/messaging';
import { UserSearchResult } from '../search/UserSearch';
import { cn } from '../../lib/utils';

interface ScheduledMessage {
  id: string;
  content: string;
  recipients: UserSearchResult[];
  scheduledFor: Date;
  type: MessageType;
  priority: Priority;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  conversationId?: string;
  templateId?: string;
  createdAt: Date;
  repeatPattern?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'approval' | 'feedback' | 'update' | 'reminder' | 'greeting' | 'follow-up';
  tags: string[];
  variables: string[];
  usage: number;
  lastUsed?: Date;
  isPublic: boolean;
  createdBy: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'time' | 'event' | 'keyword' | 'user-action';
    conditions: Record<string, any>;
  };
  actions: {
    type: 'send-message' | 'create-reminder' | 'assign-task' | 'notify-team';
    config: Record<string, any>;
  }[];
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface MessageAutomationHubProps {
  onClose?: () => void;
  conversations?: Conversation[];
  className?: string;
}

export const MessageAutomationHub: React.FC<MessageAutomationHubProps> = ({
  onClose,
  conversations: _conversations = [],
  className
}) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'templates' | 'automation' | 'analytics'>('scheduled');
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [showNewScheduledMessage, setShowNewScheduledMessage] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewAutomation, setShowNewAutomation] = useState(false);

  // Factory functions to create mock data (called once during initialization)
  const createMockScheduledMessages = (): ScheduledMessage[] => {
    const now = Date.now();
    return [
      {
        id: '1',
        content: 'Weekly project update: We\'ve completed the initial design phase and are moving to development.',
        recipients: [
          { id: 'user1', name: 'Sarah Chen', email: 'sarah@client.com' },
          { id: 'user2', name: 'Mike Johnson', email: 'mike@team.com' }
        ],
        scheduledFor: new Date(now + 2 * 60 * 60 * 1000), // 2 hours from now
        type: 'text',
        priority: 'medium',
        status: 'pending',
        templateId: 'template1',
        createdAt: new Date(),
        repeatPattern: 'weekly'
      },
      {
        id: '2',
        content: 'Design review meeting reminder: Tomorrow at 2 PM in the main conference room.',
        recipients: [
          { id: 'user3', name: 'Alex Rodriguez', email: 'alex@team.com' }
        ],
        scheduledFor: new Date(now + 24 * 60 * 60 * 1000), // Tomorrow
        type: 'text',
        priority: 'high',
        status: 'pending',
        createdAt: new Date(),
        repeatPattern: 'none'
      }
    ];
  };

  const createMockTemplates = (): MessageTemplate[] => {
    const now = Date.now();
    return [
      {
        id: 'template1',
        name: 'Weekly Project Update',
        content: 'Weekly project update: {{status}}. Next steps: {{next_steps}}',
        category: 'update',
        tags: ['project', 'weekly', 'status'],
        variables: ['status', 'next_steps'],
        usage: 24,
        lastUsed: new Date(),
        isPublic: true,
        createdBy: 'current-user'
      },
      {
        id: 'template2',
        name: 'Design Approval Request',
        content: 'Hi {{client_name}}, please review the attached designs and let us know your feedback by {{deadline}}.',
        category: 'approval',
        tags: ['design', 'approval', 'client'],
        variables: ['client_name', 'deadline'],
        usage: 18,
        lastUsed: new Date(now - 2 * 24 * 60 * 60 * 1000),
        isPublic: true,
        createdBy: 'current-user'
      },
      {
        id: 'template3',
        name: 'Meeting Reminder',
        content: 'Reminder: {{meeting_type}} meeting tomorrow at {{time}} in {{location}}.',
        category: 'reminder',
        tags: ['meeting', 'reminder'],
        variables: ['meeting_type', 'time', 'location'],
        usage: 15,
        lastUsed: new Date(now - 5 * 24 * 60 * 60 * 1000),
        isPublic: false,
        createdBy: 'current-user'
      }
    ];
  };

  const createMockAutomationRules = (): AutomationRule[] => {
    const now = Date.now();
    return [
      {
        id: 'rule1',
        name: 'Client Response Follow-up',
        description: 'Automatically send a follow-up message if client doesn\'t respond within 24 hours',
        trigger: {
          type: 'time',
          conditions: { delay: '24h', event: 'no-response' }
        },
        actions: [
          {
            type: 'send-message',
            config: {
              templateId: 'follow-up-template',
              priority: 'medium'
            }
          }
        ],
        isActive: true,
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
        lastTriggered: new Date(now - 2 * 24 * 60 * 60 * 1000),
        triggerCount: 12
      },
      {
        id: 'rule2',
        name: 'Urgent Message Escalation',
        description: 'Notify team lead when urgent messages are received outside business hours',
        trigger: {
          type: 'event',
          conditions: { priority: 'critical', time: 'after-hours' }
        },
        actions: [
          {
            type: 'notify-team',
            config: {
              recipients: ['team-lead'],
              method: 'push-notification'
            }
          }
        ],
        isActive: true,
        createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
        lastTriggered: new Date(now - 3 * 24 * 60 * 60 * 1000),
        triggerCount: 8
      }
    ];
  };

  useEffect(() => {
    queueMicrotask(() => {
      setScheduledMessages(createMockScheduledMessages());
      setTemplates(createMockTemplates());
      setAutomationRules(createMockAutomationRules());
    });
  }, []);

  return (
    <div className={cn('h-full flex flex-col bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Message Automation</h2>
            <p className="text-sm text-gray-600">
              Schedule messages, create templates, and automate workflows
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full">
          <div className="px-6 pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scheduled" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Scheduled
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Automation
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scheduled Messages Tab */}
          <TabsContent value="scheduled" className="h-full p-6 pt-0">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Scheduled Messages</h3>
                  <p className="text-sm text-gray-600">{scheduledMessages.length} messages scheduled</p>
                </div>
                <Button onClick={() => setShowNewScheduledMessage(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Message
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {scheduledMessages.map((message) => (
                  <ScheduledMessageCard
                    key={message.id}
                    message={message}
                    onEdit={(id) => console.log('Edit message:', id)}
                    onCancel={(id) => {
                      setScheduledMessages(prev =>
                        prev.map(m => m.id === id ? { ...m, status: 'cancelled' } : m)
                      );
                    }}
                    onDelete={(id) => {
                      setScheduledMessages(prev => prev.filter(m => m.id !== id));
                    }}
                  />
                ))}

                {scheduledMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No scheduled messages</p>
                    <Button onClick={() => setShowNewScheduledMessage(true)}>
                      Schedule Your First Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="h-full p-6 pt-0">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Message Templates</h3>
                  <p className="text-sm text-gray-600">{templates.length} templates available</p>
                </div>
                <Button onClick={() => setShowNewTemplate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input placeholder="Search templates..." className="w-full" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUse={(id) => console.log('Use template:', id)}
                      onEdit={(id) => console.log('Edit template:', id)}
                      onDelete={(id) => {
                        setTemplates(prev => prev.filter(t => t.id !== id));
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="h-full p-6 pt-0">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Automation Rules</h3>
                  <p className="text-sm text-gray-600">{automationRules.length} rules configured</p>
                </div>
                <Button onClick={() => setShowNewAutomation(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {automationRules.map((rule) => (
                  <AutomationRuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={(id, isActive) => {
                      setAutomationRules(prev =>
                        prev.map(r => r.id === id ? { ...r, isActive } : r)
                      );
                    }}
                    onEdit={(id) => console.log('Edit rule:', id)}
                    onDelete={(id) => {
                      setAutomationRules(prev => prev.filter(r => r.id !== id));
                    }}
                  />
                ))}

                {automationRules.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No automation rules configured</p>
                    <Button onClick={() => setShowNewAutomation(true)}>
                      Create Your First Rule
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="h-full p-6 pt-0">
            <AutomationAnalytics
              scheduledMessages={scheduledMessages}
              templates={templates}
              automationRules={automationRules}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <NewScheduledMessageModal
        isOpen={showNewScheduledMessage}
        onClose={() => setShowNewScheduledMessage(false)}
        onSave={(message: Omit<ScheduledMessage, 'id'>) => {
          setScheduledMessages(prev => [...prev, { ...message, id: `msg-${Date.now()}` }]);
          setShowNewScheduledMessage(false);
        }}
        templates={templates}
      />

      <NewTemplateModal
        isOpen={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        onSave={(template: Omit<MessageTemplate, 'id'>) => {
          setTemplates(prev => [...prev, { ...template, id: `template-${Date.now()}` }]);
          setShowNewTemplate(false);
        }}
      />

      <NewAutomationModal
        isOpen={showNewAutomation}
        onClose={() => setShowNewAutomation(false)}
        onSave={(rule: Omit<AutomationRule, 'id'>) => {
          setAutomationRules(prev => [...prev, { ...rule, id: `rule-${Date.now()}` }]);
          setShowNewAutomation(false);
        }}
        templates={templates}
      />
    </div>
  );
};

// Helper functions used by sub-components
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getStatusColor = (status: ScheduledMessage['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Category icon component to avoid creating components during render
const CategoryIconComponent: React.FC<{ category: MessageTemplate['category']; className?: string }> = ({ category, className }) => {
  switch (category) {
    case 'approval':
      return <CheckCircle className={className} />;
    case 'feedback':
      return <MessageSquare className={className} />;
    case 'update':
      return <TrendingUp className={className} />;
    case 'reminder':
      return <Clock className={className} />;
    case 'greeting':
      return <Heart className={className} />;
    case 'follow-up':
      return <RotateCcw className={className} />;
    default:
      return <MessageSquare className={className} />;
  }
};

// Sub-components
const ScheduledMessageCard: React.FC<{
  message: ScheduledMessage;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ message, onEdit, onCancel, onDelete }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(message.status)}>
                {message.status}
              </Badge>
              <Badge variant="outline">
                {formatDate(message.scheduledFor)}
              </Badge>
              {message.repeatPattern !== 'none' && (
                <Badge variant="secondary">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {message.repeatPattern}
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-800 mb-3 line-clamp-2">
              {message.content}
            </p>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3 h-3" />
              {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-4">
            <Button variant="ghost" size="sm" onClick={() => onEdit(message.id)}>
              <Edit className="w-4 h-4" />
            </Button>
            {message.status === 'pending' && (
              <Button variant="ghost" size="sm" onClick={() => onCancel(message.id)}>
                <Pause className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDelete(message.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TemplateCard: React.FC<{
  template: MessageTemplate;
  onUse: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ template, onUse, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CategoryIconComponent category={template.category} className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-sm">{template.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(template.id)}>
              <Edit className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(template.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 mb-3 line-clamp-3">
          {template.content}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Used {template.usage} times</span>
          <span>{template.variables.length} variables</span>
        </div>

        <Button onClick={() => onUse(template.id)} size="sm" className="w-full">
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
};

const AutomationRuleCard: React.FC<{
  rule: AutomationRule;
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ rule, onToggle, onEdit, onDelete }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-medium text-gray-900">{rule.name}</h4>
              <Switch
                checked={rule.isActive}
                onCheckedChange={(checked) => onToggle(rule.id, checked)}
              />
            </div>

            <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Triggered {rule.triggerCount} times</span>
              {rule.lastTriggered && (
                <span>Last: {formatDate(rule.lastTriggered)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-4">
            <Button variant="ghost" size="sm" onClick={() => onEdit(rule.id)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(rule.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions and additional components would continue here...
const AutomationAnalytics: React.FC<any> = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Messages Scheduled</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">142</div>
          <div className="text-sm text-green-600">+18% this month</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Templates Used</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">89</div>
          <div className="text-sm text-blue-600">12 most popular</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Automation Saves</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">24h</div>
          <div className="text-sm text-purple-600">Time saved</div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Modal components would be implemented here as well...
const NewScheduledMessageModal: React.FC<any> = () => null;
const NewTemplateModal: React.FC<any> = () => null;
const NewAutomationModal: React.FC<any> = () => null;