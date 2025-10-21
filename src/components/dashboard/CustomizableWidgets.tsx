import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Plus,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Calendar,
  FileText,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Widget {
  id: string;
  title: string;
  type: 'stat' | 'chart' | 'list' | 'activity';
  icon: React.ComponentType<any>;
  visible: boolean;
  content: any;
  size: 'small' | 'medium' | 'large';
}

function SortableWidget({ widget, onToggleVisibility }: { widget: Widget; onToggleVisibility: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const Icon = widget.icon;

  if (!widget.visible) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        widget.size === 'small' && 'col-span-1',
        widget.size === 'medium' && 'col-span-1 md:col-span-2',
        widget.size === 'large' && 'col-span-1 md:col-span-2 lg:col-span-3'
      )}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
              <Icon className="h-4 w-4 text-gray-600" />
              <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onToggleVisibility(widget.id)}
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {widget.type === 'stat' && (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {widget.content.value}
              </div>
              <p className="text-xs text-gray-600">
                {widget.content.label}
              </p>
              {widget.content.trend && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {widget.content.trend > 0 ? '+' : ''}{widget.content.trend}%
                </Badge>
              )}
            </div>
          )}

          {widget.type === 'list' && (
            <div className="space-y-2">
              {widget.content.items.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </div>
          )}

          {widget.type === 'activity' && (
            <div className="space-y-2">
              {widget.content.activities.slice(0, 3).map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                  <div>
                    <p className="text-gray-700">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomizableWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'active-projects',
      title: 'Active Projects',
      type: 'stat',
      icon: FileText,
      visible: true,
      content: { value: '12', label: '+2 this week', trend: 16 },
      size: 'small'
    },
    {
      id: 'team-members',
      title: 'Team Members',
      type: 'stat',
      icon: Users,
      visible: true,
      content: { value: '24', label: 'All active', trend: 4 },
      size: 'small'
    },
    {
      id: 'messages',
      title: 'Unread Messages',
      type: 'stat',
      icon: MessageSquare,
      visible: true,
      content: { value: '8', label: '3 urgent', trend: -12 },
      size: 'small'
    },
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      type: 'stat',
      icon: Target,
      visible: true,
      content: { value: '92%', label: 'Above target', trend: 8 },
      size: 'small'
    },
    {
      id: 'recent-projects',
      title: 'Recent Projects',
      type: 'list',
      icon: FileText,
      visible: true,
      content: {
        items: [
          { label: 'Project Alpha', value: 'In Progress' },
          { label: 'Project Beta', value: 'Review' },
          { label: 'Project Gamma', value: 'Planning' }
        ]
      },
      size: 'medium'
    },
    {
      id: 'activity-feed',
      title: 'Recent Activity',
      type: 'activity',
      icon: Activity,
      visible: true,
      content: {
        activities: [
          { action: 'Sarah updated Project Alpha', time: '5 min ago' },
          { action: 'New file added to Beta', time: '12 min ago' },
          { action: 'Comment on Design Review', time: '23 min ago' }
        ]
      },
      size: 'medium'
    },
    {
      id: 'upcoming-deadlines',
      title: 'Upcoming Deadlines',
      type: 'list',
      icon: Calendar,
      visible: false,
      content: {
        items: [
          { label: 'Project Alpha Final', value: '2 days' },
          { label: 'Beta Review Meeting', value: '5 days' },
          { label: 'Gamma Kickoff', value: '1 week' }
        ]
      },
      size: 'small'
    },
    {
      id: 'time-tracking',
      title: 'Time This Week',
      type: 'stat',
      icon: Clock,
      visible: false,
      content: { value: '32.5h', label: '8% above average', trend: 8 },
      size: 'small'
    }
  ]);

  const [showHidden, setShowHidden] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleVisibility = (id: string) => {
    setWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    );
  };

  const visibleWidgets = widgets.filter(w => w.visible);
  const hiddenWidgets = widgets.filter(w => !w.visible);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workspace</h2>
          <p className="text-sm text-gray-600 mt-1">
            Drag to reorder • Click eye icon to hide
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHidden(!showHidden)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showHidden ? 'Done' : 'Customize'}
        </Button>
      </div>

      {/* Hidden Widgets Panel */}
      {showHidden && hiddenWidgets.length > 0 && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Hidden Widgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hiddenWidgets.map(widget => {
                const Icon = widget.icon;
                return (
                  <Button
                    key={widget.id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(widget.id)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {widget.title}
                    <Eye className="h-3 w-3 ml-1" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draggable Widget Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleWidgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                onToggleVisibility={toggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {visibleWidgets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No widgets visible
            </h3>
            <p className="text-gray-600 mb-4">
              Show some widgets to customize your workspace
            </p>
            <Button onClick={() => setShowHidden(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Widgets
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
