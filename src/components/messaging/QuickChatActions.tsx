/**
 * Quick Chat Actions Component
 * Provides quick access to start common conversation types
 */

import React from 'react';
import { MessageCircle, Users, Folder, Bell, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ConversationType, Priority } from '../../types/messaging';

interface QuickChatActionsProps {
  onQuickAction: (type: ConversationType, priority: Priority, name: string) => void;
  className?: string;
}

const quickActions = [
  {
    id: 'urgent-client',
    name: 'Urgent Client Chat',
    type: 'direct' as ConversationType,
    priority: 'high' as Priority,
    icon: Bell,
    color: 'bg-red-500 hover:bg-red-600',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Start urgent discussion'
  },
  {
    id: 'quick-feedback',
    name: 'Quick Feedback',
    type: 'direct' as ConversationType,
    priority: 'medium' as Priority,
    icon: MessageCircle,
    color: 'bg-blue-500 hover:bg-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Get quick feedback'
  },
  {
    id: 'project-channel',
    name: 'Project Channel',
    type: 'project' as ConversationType,
    priority: 'medium' as Priority,
    icon: Folder,
    color: 'bg-green-500 hover:bg-green-600',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Project discussion'
  },
  {
    id: 'team-chat',
    name: 'Team Chat',
    type: 'team' as ConversationType,
    priority: 'low' as Priority,
    icon: Users,
    color: 'bg-purple-500 hover:bg-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Team collaboration'
  },
];

export function QuickChatActions({ onQuickAction, className = '' }: QuickChatActionsProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="font-medium text-sm">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              onClick={() => onQuickAction(action.type, action.priority, action.name)}
              className={`h-auto p-3 justify-start hover:${action.bgColor} border-gray-200 group`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-full ${action.bgColor} group-hover:bg-white transition-colors`}>
                  <IconComponent className={`w-4 h-4 ${action.textColor}`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-gray-900 mb-1">
                    {action.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {action.description}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="secondary"
                    className="text-xs capitalize"
                  >
                    {action.type}
                  </Badge>
                  {action.priority !== 'low' && (
                    <Badge
                      variant={action.priority === 'high' ? 'destructive' : 'default'}
                      className="text-xs capitalize"
                    >
                      {action.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickChatActions;