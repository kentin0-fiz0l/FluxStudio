/**
 * Create Conversation Dialog Component
 * Dialog for creating new conversations with different types and settings
 */

import { useState, useEffect } from 'react';
import { Users, MessageCircle, Folder, Bell, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ConversationType, Priority, MessageUser, Conversation } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';
import { useOrganization } from '../../contexts/OrganizationContext';
import { cn } from '../../lib/utils';

interface CreateConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
  currentUser: MessageUser;
  initialType?: ConversationType;
  initialParticipants?: MessageUser[];
}

const conversationTypes = [
  {
    value: 'direct' as ConversationType,
    label: 'Direct Message',
    description: 'Private conversation between users',
    icon: MessageCircle,
  },
  {
    value: 'project' as ConversationType,
    label: 'Project Channel',
    description: 'Project-specific discussions',
    icon: Folder,
  },
  {
    value: 'team' as ConversationType,
    label: 'Team Channel',
    description: 'Team collaboration space',
    icon: Users,
  },
  {
    value: 'consultation' as ConversationType,
    label: 'Consultation',
    description: 'Consultation session room',
    icon: Bell,
  },
  {
    value: 'support' as ConversationType,
    label: 'Support',
    description: 'Support conversation',
    icon: MessageCircle,
  },
  {
    value: 'broadcast' as ConversationType,
    label: 'Announcement',
    description: 'One-to-many announcements',
    icon: Bell,
  },
];

// Quick Chat Templates for faster creation
const quickChatTemplates = [
  {
    id: 'quick-feedback',
    name: 'Quick Feedback',
    type: 'direct' as ConversationType,
    description: 'Get quick feedback on a design or idea',
    priority: 'medium' as Priority,
    icon: MessageCircle,
  },
  {
    id: 'urgent-client',
    name: 'Urgent Client Discussion',
    type: 'direct' as ConversationType,
    description: 'Important client conversation',
    priority: 'high' as Priority,
    icon: Bell,
  },
  {
    id: 'project-kickoff',
    name: 'Project Kickoff',
    type: 'project' as ConversationType,
    description: 'Start a new project discussion',
    priority: 'medium' as Priority,
    icon: Folder,
  },
  {
    id: 'team-standup',
    name: 'Team Standup',
    type: 'team' as ConversationType,
    description: 'Daily team sync conversation',
    priority: 'low' as Priority,
    icon: Users,
  },
];

export function CreateConversationDialog({
  isOpen,
  onClose,
  onConversationCreated,
  currentUser,
  initialType = 'direct',
  initialParticipants = []
}: CreateConversationDialogProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<ConversationType>(initialType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedParticipants, setSelectedParticipants] = useState<MessageUser[]>(initialParticipants);
  const [availableUsers, setAvailableUsers] = useState<MessageUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const { projects: orgProjects, teams, organizations } = useOrganization();

  useEffect(() => {
    if (isOpen) {
      // Load available users and projects
      loadAvailableUsers();
      loadProjects();

      // Reset form when opening
      setStep(1);
      setType(initialType);
      setSelectedParticipants(initialParticipants);
      setName('');
      setDescription('');
      setPriority('medium');
    }
  }, [isOpen, initialType, initialParticipants]);

  const loadAvailableUsers = async () => {
    try {
      // In a real app, this would fetch from an API
      // Enhanced mock data with more realistic users
      const mockUsers: MessageUser[] = [
        {
          id: 'client-1',
          name: 'Director Johnson',
          userType: 'client',
          avatar: '/avatars/director.jpg',
          isOnline: true,
          lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
        {
          id: 'sarah-designer',
          name: 'Sarah Designer',
          userType: 'designer',
          avatar: '/avatars/sarah.jpg',
          isOnline: true,
          lastSeen: new Date(),
        },
        {
          id: 'mike-client',
          name: 'Mike Thompson',
          userType: 'client',
          avatar: '/avatars/mike.jpg',
          isOnline: false,
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          id: 'admin-user',
          name: 'Admin User',
          userType: 'admin',
          avatar: '/avatars/admin.jpg',
          isOnline: true,
          lastSeen: new Date(),
        },
        {
          id: 'project-manager',
          name: 'Lisa Martinez',
          userType: 'designer',
          avatar: '/avatars/lisa.jpg',
          isOnline: false,
          lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      ].filter(user => user.id !== currentUser.id);

      setAvailableUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadProjects = async () => {
    try {
      // Use organization projects if available, otherwise use mock data
      if (orgProjects && orgProjects.length > 0) {
        setProjects(orgProjects);
      } else {
        // Mock project data for demo
        setProjects([
          { id: '1', name: 'Brand Redesign Project' },
          { id: '2', name: 'Website Development' },
          { id: '3', name: 'Marketing Campaign' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedParticipants.some(p => p.id === user.id)
  );

  const handleParticipantToggle = (user: MessageUser) => {
    setSelectedParticipants(prev => {
      const isSelected = prev.some(p => p.id === user.id);
      if (isSelected) {
        return prev.filter(p => p.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = quickChatTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setType(template.type);
      setName(template.name);
      setDescription(template.description);
      setPriority(template.priority);
      setShowTemplates(false);
      setStep(2); // Skip to participant selection
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleCreate = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (type !== 'direct' && !name.trim()) {
        alert('Please enter a conversation name');
        return;
      }

      if (selectedParticipants.length === 0) {
        alert('Please select at least one participant');
        return;
      }

      // Generate name for direct messages
      let conversationName = name;
      if (type === 'direct' && !name) {
        conversationName = selectedParticipants.map(p => p.name).join(', ');
      }

      const conversation = await messagingService.createConversation({
        type,
        name: conversationName,
        description,
        participants: [currentUser.id, ...selectedParticipants.map(p => p.id)],
        projectId: selectedProjectId || undefined,
        metadata: {
          priority,
          isArchived: false,
          isMuted: false,
          isPinned: false,
          tags: [],
        },
      });

      // Success feedback
      console.log('✅ Conversation created successfully:', conversationName);

      // Show success message
      const successMsg = `${conversationName} conversation created successfully!`;
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: successMsg
          }
        }));
      }

      onConversationCreated(conversation);
      onClose();

      // Reset form
      setStep(1);
      setName('');
      setDescription('');
      setSelectedParticipants([]);
      setSelectedProjectId('');
      setPriority('medium');
    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      alert('Failed to create conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return type;
    if (step === 2) {
      if (type === 'direct') return selectedParticipants.length > 0;
      return name.trim().length > 0 && selectedParticipants.length > 0;
    }
    return true;
  };

  const selectedTypeConfig = conversationTypes.find(t => t.value === type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Conversation</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant={showTemplates ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowTemplates(true)}
              className="text-xs"
            >
              Quick Templates
            </Button>
            <Button
              variant={showTemplates ? "outline" : "primary"}
              size="sm"
              onClick={() => setShowTemplates(false)}
              className="text-xs"
            >
              Custom
            </Button>
          </div>
        </DialogHeader>

        {/* Quick Templates View */}
        {showTemplates && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Choose a template to get started quickly</Label>
              <div className="grid grid-cols-1 gap-3 mt-3">
                {quickChatTemplates.map(template => {
                  const IconComponent = template.icon;
                  return (
                    <button
                      key={template.id}
                      className="p-4 border rounded-lg cursor-pointer transition-colors text-left hover:bg-accent hover:border-primary"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          template.priority === 'high' ? 'bg-orange-100' :
                          template.priority === 'critical' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          <IconComponent className={`w-4 h-4 ${
                            template.priority === 'high' ? 'text-orange-600' :
                            template.priority === 'critical' ? 'text-red-600' :
                            'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {template.type}
                            </Badge>
                            <Badge variant={
                              template.priority === 'high' ? 'error' :
                              template.priority === 'critical' ? 'error' :
                              'default'
                            } className="text-xs capitalize">
                              {template.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Custom Flow */}
        {!showTemplates && step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Conversation Type</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {conversationTypes.map(typeConfig => {
                  const IconComponent = typeConfig.icon;
                  return (
                    <button
                      key={typeConfig.value}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors text-left",
                        "hover:bg-accent",
                        type === typeConfig.value && "border-primary bg-accent"
                      )}
                      onClick={() => setType(typeConfig.value)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="font-medium text-sm">{typeConfig.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {typeConfig.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTypeConfig && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <selectedTypeConfig.icon className="w-4 h-4" />
                  <span className="font-medium">{selectedTypeConfig.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedTypeConfig.description}
                </p>
              </div>
            )}
          </div>
        )}

        {!showTemplates && step === 2 && (
          <div className="space-y-4">
            {/* Conversation Details */}
            {type !== 'direct' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter conversation name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose of this conversation"
                    rows={2}
                  />
                </div>

                {type === 'project' && (
                  <div>
                    <Label>Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Participant Selection */}
            <div>
              <Label>
                {type === 'direct' ? 'Select participants' : 'Add participants'}
              </Label>

              {/* Search */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>

              {/* Selected Participants */}
              {selectedParticipants.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Selected:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedParticipants.map(participant => (
                      <Badge key={participant.id} variant="secondary" className="flex items-center gap-1">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="text-xs">
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {participant.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleParticipantToggle(participant)}
                          className="ml-1 h-4 w-4 p-0 rounded-full hover:bg-muted"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div className="mt-3 max-h-48 overflow-y-auto border rounded-md">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchQuery ? 'No users found' : 'No more users available'}
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 text-left w-full"
                      onClick={() => handleParticipantToggle(user)}
                    >
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {user.isOnline ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{user.name}</div>
                          {user.isOnline && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700">
                              Online
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {user.userType} • {user.isOnline ? 'Active now' : `Last seen ${formatLastSeen(user.lastSeen || new Date())}`}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Template Selection - Participant Step */}
        {showTemplates && selectedTemplate && (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg">
              <div className="text-sm font-medium mb-1">Selected Template</div>
              <div className="text-sm text-muted-foreground">
                {quickChatTemplates.find(t => t.id === selectedTemplate)?.name}
              </div>
            </div>

            {/* Participant Selection for Templates */}
            <div>
              <Label>
                {type === 'direct' ? 'Select participants' : 'Add participants'}
              </Label>

              {/* Search */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>

              {/* Selected Participants */}
              {selectedParticipants.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Selected:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedParticipants.map(participant => (
                      <Badge key={participant.id} variant="secondary" className="flex items-center gap-1">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="text-xs">
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {participant.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleParticipantToggle(participant)}
                          className="ml-1 h-4 w-4 p-0 rounded-full hover:bg-muted"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div className="mt-3 max-h-48 overflow-y-auto border rounded-md">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchQuery ? 'No users found' : 'No more users available'}
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 text-left w-full"
                      onClick={() => handleParticipantToggle(user)}
                    >
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {user.isOnline ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{user.name}</div>
                          {user.isOnline && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700">
                              Online
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {user.userType} • {user.isOnline ? 'Active now' : `Last seen ${formatLastSeen(user.lastSeen || new Date())}`}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {!showTemplates && step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {showTemplates && selectedTemplate && (
                <Button variant="outline" onClick={() => {
                  setSelectedTemplate(null);
                  setShowTemplates(true);
                }}>
                  Back to Templates
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {showTemplates && !selectedTemplate && (
                <Button
                  onClick={() => setShowTemplates(false)}
                  variant="outline"
                >
                  Use Custom
                </Button>
              )}
              {!showTemplates && step < 2 ? (
                <Button onClick={() => setStep(2)} disabled={!canProceed()}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={(!showTemplates && !canProceed()) || (showTemplates && !selectedTemplate) || (showTemplates && selectedParticipants.length === 0) || loading}
                >
                  {loading ? 'Creating...' : 'Create Conversation'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateConversationDialog;