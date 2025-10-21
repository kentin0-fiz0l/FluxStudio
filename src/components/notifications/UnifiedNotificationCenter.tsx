/**
 * Unified Notification Center
 * Centralized notification system for all platform activities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  MessageSquare,
  Folder,
  Users,
  Calendar,
  AlertCircle,
  Info,
  Zap,
  Clock,
  Filter,
  Settings,
  Archive,
  Trash2,
  ExternalLink,
  ChevronRight,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface Notification {
  id: string;
  type: 'message' | 'mention' | 'project' | 'workflow' | 'system' | 'achievement' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionable: boolean;
  source: {
    type: 'user' | 'system' | 'workflow' | 'ai';
    id: string;
    name: string;
    avatar?: string;
  };
  context?: {
    projectId?: string;
    conversationId?: string;
    workflowId?: string;
  };
  actions?: {
    primary?: {
      label: string;
      action: () => void;
    };
    secondary?: {
      label: string;
      action: () => void;
    };
  };
  metadata?: {
    tags?: string[];
    category?: string;
    expiresAt?: Date;
  };
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sound: boolean;
  desktop: boolean;
  categories: {
    messages: boolean;
    projects: boolean;
    workflows: boolean;
    system: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export function UnifiedNotificationCenter() {
  const { state, actions } = useWorkspace();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'actionable'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sound: true,
    desktop: true,
    categories: {
      messages: true,
      projects: true,
      workflows: true,
      system: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  // Generate sample notifications based on workspace activity
  useEffect(() => {
    const generateNotifications = () => {
      const newNotifications: Notification[] = [];

      // Convert recent activities to notifications
      state.recentActivity.forEach(activity => {
        newNotifications.push({
          id: `notif-${activity.id}`,
          type: activity.type === 'message' ? 'message' : 'project',
          priority: 'medium',
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp,
          read: false,
          actionable: true,
          source: {
            type: 'user',
            id: activity.userId,
            name: activity.userName
          },
          context: {
            projectId: activity.context?.projectId,
            conversationId: activity.context?.conversationId
          },
          actions: {
            primary: {
              label: 'View',
              action: () => console.log('View', activity.id)
            }
          }
        });
      });

      // Add system notifications
      if (state.activeProject) {
        newNotifications.push({
          id: 'system-1',
          type: 'reminder',
          priority: 'high',
          title: 'Project deadline approaching',
          description: `${state.activeProject.name} is due in 3 days`,
          timestamp: new Date(),
          read: false,
          actionable: true,
          source: {
            type: 'system',
            id: 'system',
            name: 'System'
          },
          context: {
            projectId: state.activeProject.id
          },
          actions: {
            primary: {
              label: 'Review Project',
              action: () => {}
            }
          }
        });
      }

      // Add achievement notification
      newNotifications.push({
        id: 'achievement-1',
        type: 'achievement',
        priority: 'low',
        title: 'Productivity Milestone!',
        description: 'You\'ve completed 10 tasks this week',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
        actionable: false,
        source: {
          type: 'system',
          id: 'achievements',
          name: 'Achievements'
        },
        metadata: {
          tags: ['milestone', 'productivity']
        }
      });

      // Add workflow notification
      newNotifications.push({
        id: 'workflow-1',
        type: 'workflow',
        priority: 'medium',
        title: 'Workflow completed',
        description: 'Design review workflow finished successfully',
        timestamp: new Date(Date.now() - 7200000),
        read: false,
        actionable: true,
        source: {
          type: 'workflow',
          id: 'wf-123',
          name: 'Automation'
        },
        actions: {
          primary: {
            label: 'View Results',
            action: () => {}
          }
        }
      });

      setNotifications(newNotifications);
    };

    generateNotifications();
  }, [state]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply read filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'actionable') {
      filtered = filtered.filter(n => n.actionable);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.type === selectedCategory);
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notifications, filter, selectedCategory]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const archiveNotification = (id: string) => {
    // In production, move to archive storage
    deleteNotification(id);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message': return MessageSquare;
      case 'mention': return Users;
      case 'project': return Folder;
      case 'workflow': return Zap;
      case 'system': return Info;
      case 'achievement': return AlertCircle;
      case 'reminder': return Clock;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Request notification permissions
  useEffect(() => {
    if (preferences.desktop && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [preferences.desktop]);

  // Show desktop notification for new high-priority items
  useEffect(() => {
    const latestNotification = notifications[0];
    if (
      latestNotification &&
      !latestNotification.read &&
      latestNotification.priority !== 'low' &&
      preferences.desktop &&
      Notification.permission === 'granted'
    ) {
      new Notification(latestNotification.title, {
        body: latestNotification.description,
        icon: '/favicon.ico'
      });
    }
  }, [notifications, preferences.desktop]);

  return (
    <>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Center */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-0 z-50"
          >
            <Card className="w-96 max-h-[600px] flex flex-col shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bell size={18} />
                    Notifications
                    {unreadCount > 0 && (
                      <Badge variant="destructive">{unreadCount}</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <Tabs defaultValue="notifications" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="notifications" className="flex-1 flex flex-col mt-0">
                  {/* Filters */}
                  <div className="px-4 py-2 border-b">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={filter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={filter === 'unread' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('unread')}
                      >
                        Unread
                      </Button>
                      <Button
                        variant={filter === 'actionable' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('actionable')}
                      >
                        Actionable
                      </Button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <ScrollArea className="flex-1">
                    {filteredNotifications.length === 0 ? (
                      <div className="text-center py-8">
                        <BellOff className="mx-auto text-gray-400 mb-2" size={32} />
                        <p className="text-gray-600">No notifications</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {filteredNotifications.map(notification => {
                          const Icon = getNotificationIcon(notification.type);
                          const priorityColor = getPriorityColor(notification.priority);

                          return (
                            <div
                              key={notification.id}
                              className={cn(
                                "p-3 rounded-lg mb-2 transition-all",
                                notification.read ? "bg-gray-50" : "bg-blue-50",
                                "hover:bg-gray-100 cursor-pointer"
                              )}
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                  priorityColor
                                )}>
                                  <Icon size={16} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {notification.title}
                                      </p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        {notification.description}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {formatTimeAgo(notification.timestamp)}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        from {notification.source.name}
                                      </span>
                                    </div>

                                    {notification.actions && (
                                      <div className="flex gap-1">
                                        {notification.actions.primary && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              notification.actions.primary!.action();
                                            }}
                                          >
                                            {notification.actions.primary.label}
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 px-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            archiveNotification(notification.id);
                                          }}
                                        >
                                          <Archive size={12} />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2">Notification Channels</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email" className="text-sm">Email</Label>
                          <Switch
                            id="email"
                            checked={preferences.email}
                            onCheckedChange={(checked) =>
                              setPreferences(prev => ({ ...prev, email: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="push" className="text-sm">Push Notifications</Label>
                          <Switch
                            id="push"
                            checked={preferences.push}
                            onCheckedChange={(checked) =>
                              setPreferences(prev => ({ ...prev, push: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sound" className="text-sm">
                            <div className="flex items-center gap-2">
                              Sound
                              {preferences.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            </div>
                          </Label>
                          <Switch
                            id="sound"
                            checked={preferences.sound}
                            onCheckedChange={(checked) =>
                              setPreferences(prev => ({ ...prev, sound: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop" className="text-sm">Desktop Notifications</Label>
                          <Switch
                            id="desktop"
                            checked={preferences.desktop}
                            onCheckedChange={(checked) =>
                              setPreferences(prev => ({ ...prev, desktop: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2">Categories</Label>
                      <div className="space-y-2">
                        {Object.entries(preferences.categories).map(([category, enabled]) => (
                          <div key={category} className="flex items-center justify-between">
                            <Label htmlFor={category} className="text-sm capitalize">
                              {category}
                            </Label>
                            <Switch
                              id={category}
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                setPreferences(prev => ({
                                  ...prev,
                                  categories: { ...prev.categories, [category]: checked }
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2">Quiet Hours</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="quiet" className="text-sm">Enable Quiet Hours</Label>
                          <Switch
                            id="quiet"
                            checked={preferences.quietHours.enabled}
                            onCheckedChange={(checked) =>
                              setPreferences(prev => ({
                                ...prev,
                                quietHours: { ...prev.quietHours, enabled: checked }
                              }))
                            }
                          />
                        </div>
                        {preferences.quietHours.enabled && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock size={12} />
                            {preferences.quietHours.start} - {preferences.quietHours.end}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default UnifiedNotificationCenter;