import {
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  UserMinus,
  Flag,
  Check as FlagCheck,
  Upload,
  FileText,
  LayoutGrid,
  Archive,
  Settings,
} from 'lucide-react';
import type { ActivityType } from './ActivityItem';

export const ACTIVITY_ICON_MAP: Record<ActivityType, React.ElementType> = {
  'task.created': PlusCircle,
  'task.updated': Edit,
  'task.deleted': Trash2,
  'task.completed': CheckCircle2,
  'comment.created': MessageSquare,
  'comment.deleted': Trash2,
  'member.added': UserPlus,
  'member.removed': UserMinus,
  'milestone.created': Flag,
  'milestone.completed': FlagCheck,
  'file.uploaded': Upload,
  'file.deleted': FileText,
  'formation.created': LayoutGrid,
  'formation.updated': LayoutGrid,
  'project.updated': Settings,
  'project.archived': Archive,
  'message.sent': MessageSquare,
};

export const ACTIVITY_COLOR_MAP: Record<ActivityType, string> = {
  'task.created': 'text-blue-600 bg-blue-100',
  'task.updated': 'text-purple-600 bg-purple-100',
  'task.deleted': 'text-red-600 bg-red-100',
  'task.completed': 'text-success-600 bg-success-100',
  'comment.created': 'text-accent-600 bg-accent-100',
  'comment.deleted': 'text-red-600 bg-red-100',
  'member.added': 'text-primary-600 bg-primary-100',
  'member.removed': 'text-orange-600 bg-orange-100',
  'milestone.created': 'text-secondary-600 bg-secondary-100',
  'milestone.completed': 'text-success-600 bg-success-100',
  'file.uploaded': 'text-green-600 bg-green-100',
  'file.deleted': 'text-red-600 bg-red-100',
  'formation.created': 'text-indigo-600 bg-indigo-100',
  'formation.updated': 'text-indigo-600 bg-indigo-100',
  'project.updated': 'text-gray-600 bg-gray-100',
  'project.archived': 'text-amber-600 bg-amber-100',
  'message.sent': 'text-cyan-600 bg-cyan-100',
};

export const getActivityColor = (type: ActivityType): string => {
  return ACTIVITY_COLOR_MAP[type] || 'text-neutral-600 bg-neutral-100';
};
