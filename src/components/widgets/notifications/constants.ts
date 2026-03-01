import {
  Bell,
  Check,
  AlertTriangle,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Star,
  Settings,
} from 'lucide-react';
import type { NotificationType, Priority } from './types';

export const iconMap: Record<NotificationType | string, typeof Bell> = {
  message: MessageSquare,
  mention: Users,
  file_shared: FileText,
  approval_request: Star,
  approval_status: Check,
  milestone: Calendar,
  consultation: Users,
  deadline: AlertTriangle,
  system: Settings,
  announcement: Bell,
  invitation: Users,
  comment: MessageSquare,
  activity: Bell,
};

export const priorityLabels: Record<Priority, string> = {
  critical: 'Critical priority',
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
};
