/**
 * QuickActionPanel Component - Simplified 1-2 Click Conversation Creation
 * Smart panel for rapid conversation creation with context-aware templates
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Calendar,
  Star,
  Zap,
  Palette,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { MessageUser, ConversationType, Priority } from '../../types/messaging';
import { useMessaging } from '../../hooks/useMessaging';
import { useOrganization } from '../../contexts/OrganizationContext';
import { cn } from '../../lib/utils';

interface QuickActionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: MessageUser;
}

interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  type: ConversationType;
  priority: Priority;
  icon: React.ElementType;
  gradient: string;
  suggestedParticipants?: string[];
  autoMessage?: string;
  category: 'common' | 'project' | 'feedback' | 'support';
}

const quickTemplates: QuickTemplate[] = [
  {
    id: 'quick-feedback',
    name: 'Get Feedback',
    description: 'Quick design feedback from team or client',
    type: 'direct',
    priority: 'medium',
    icon: Palette,
    gradient: 'from-purple-500 to-pink-500',
    autoMessage: "Hi! I'd love to get your thoughts on this design. What do you think?",
    category: 'feedback'
  },
  {
    id: 'client-approval',
    name: 'Client Approval',
    description: 'Request final approval from client',
    type: 'direct',
    priority: 'high',
    icon: CheckCircle,
    gradient: 'from-green-500 to-emerald-500',
    autoMessage: "Please review this design for final approval. I believe it meets all our discussed requirements.",
    category: 'project'
  },
  {
    id: 'urgent-question',
    name: 'Urgent Question',
    description: 'Quick question that needs immediate response',
    type: 'direct',
    priority: 'high',
    icon: AlertCircle,
    gradient: 'from-red-500 to-orange-500',
    autoMessage: "Quick urgent question: ",
    category: 'common'
  },
  {
    id: 'project-update',
    name: 'Project Update',
    description: 'Share progress with project team',
    type: 'project',
    priority: 'medium',
    icon: Star,
    gradient: 'from-blue-500 to-cyan-500',
    autoMessage: "Here's the latest update on our project: ",
    category: 'project'
  },
  {
    id: 'schedule-meeting',
    name: 'Schedule Meeting',
    description: 'Plan a consultation or review session',
    type: 'consultation',
    priority: 'medium',
    icon: Calendar,
    gradient: 'from-indigo-500 to-purple-500',
    autoMessage: "Could we schedule a meeting to discuss this further? I have some ideas to explore.",
    category: 'common'
  },
  {
    id: 'team-standup',
    name: 'Team Standup',
    description: 'Daily team sync conversation',
    type: 'team',
    priority: 'low',
    icon: Users,
    gradient: 'from-teal-500 to-green-500',
    autoMessage: "Daily standup - what's everyone working on today?",
    category: 'common'
  }
];

export function QuickActionPanel({ isOpen, onClose, currentUser }: QuickActionPanelProps) {
  const { createConversation } = useMessaging();
  const { projects, teams } = useOrganization();
  const [selectedTemplate, setSelectedTemplate] = useState<QuickTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<MessageUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'templates' | 'participants' | 'confirm'>('templates');

  // Mock users for selection (in real app, this would come from API)
  const availableUsers: MessageUser[] = [
    {
      id: 'user-2',
      name: 'Sarah Johnson',
      userType: 'client',
      avatar: '/avatars/sarah.jpg',
      isOnline: true
    },
    {
      id: 'user-3',
      name: 'Mike Chen',
      userType: 'designer',
      avatar: '/avatars/mike.jpg',
      isOnline: true
    },
    {
      id: 'user-4',
      name: 'Emma Wilson',
      userType: 'client',
      avatar: '/avatars/emma.jpg',
      isOnline: false
    },
    {
      id: 'user-5',
      name: 'David Kim',
      userType: 'designer',
      avatar: '/avatars/david.jpg',
      isOnline: true
    }
  ];

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    user.id !== currentUser.id
  );

  const resetState = () => {
    setSelectedTemplate(null);
    setSearchQuery('');
    setSelectedParticipants([]);
    setStep('templates');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTemplateSelect = (template: QuickTemplate) => {
    setSelectedTemplate(template);

    // For direct messages, go straight to participant selection
    if (template.type === 'direct') {
      setStep('participants');
    } else {
      // For other types, we might auto-create or show confirmation
      setStep('confirm');
    }
  };

  const toggleParticipant = (user: MessageUser) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p.id === user.id);
      if (exists) {
        return prev.filter(p => p.id !== user.id);
      } else {
        // For direct messages, only allow one participant
        if (selectedTemplate?.type === 'direct') {
          return [user];
        }
        return [...prev, user];
      }
    });
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);

    try {
      const conversationName =
        selectedTemplate.type === 'direct' && selectedParticipants.length === 1
          ? `${currentUser.name} & ${selectedParticipants[0].name}`
          : selectedTemplate.name;

      await createConversation({
        type: selectedTemplate.type,
        name: conversationName,
        description: selectedTemplate.description,
        participants: selectedParticipants.map(p => p.id),
        priority: selectedTemplate.priority
      });

      // Note: Auto-message feature reserved for future implementation

      handleClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const TemplateCard = ({ template }: { template: QuickTemplate }) => {
    const Icon = template.icon;

    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleTemplateSelect(template)}
        className="cursor-pointer group"
      >
        <Card className="h-full border-2 border-transparent hover:border-blue-200 transition-all duration-200 overflow-hidden">
          <CardContent className="p-4">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br',
              template.gradient
            )}>
              <Icon size={24} className="text-white" />
            </div>

            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {template.name}
            </h3>

            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {template.description}
            </p>

            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  template.priority === 'high' ? 'bg-red-100 text-red-700' :
                  template.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                )}
              >
                {template.priority}
              </Badge>

              <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const UserCard = ({ user, isSelected }: { user: MessageUser; isSelected: boolean }) => {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toggleParticipant(user)}
        className={cn(
          'p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className={cn(
              'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
              user.isOnline ? 'bg-green-500' : 'bg-gray-400'
            )} />
          </div>

          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{user.name}</h4>
            <p className="text-sm text-gray-500 capitalize">{user.userType}</p>
          </div>

          {isSelected && (
            <CheckCircle size={20} className="text-blue-600" />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              Quick Actions
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'templates' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    What would you like to do?
                  </h3>
                  <p className="text-gray-600">
                    Choose a template to get started quickly
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {quickTemplates.map(template => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'participants' && selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Who would you like to {selectedTemplate.type === 'direct' ? 'message' : 'include'}?
                  </h3>
                  <p className="text-gray-600">
                    {selectedTemplate.type === 'direct'
                      ? 'Select one person to start a conversation'
                      : 'Select team members for this conversation'
                    }
                  </p>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      isSelected={selectedParticipants.some(p => p.id === user.id)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('templates')}>
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={selectedParticipants.length === 0 || isCreating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? (
                      <>
                        <Clock size={16} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Start Conversation
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br',
                    selectedTemplate.gradient
                  )}>
                    <selectedTemplate.icon size={32} className="text-white" />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Create {selectedTemplate.name}?
                  </h3>
                  <p className="text-gray-600">
                    {selectedTemplate.description}
                  </p>
                </div>

                {selectedTemplate.autoMessage && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Auto Message</h4>
                      <p className="text-blue-800 text-sm">
                        "{selectedTemplate.autoMessage}"
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('templates')}>
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? (
                      <>
                        <Clock size={16} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} className="mr-2" />
                        Create Conversation
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuickActionPanel;