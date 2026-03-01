import { Edit3, Eye, CheckCircle, XCircle, MessageSquare, Pencil, ThumbsUp, Flag } from 'lucide-react';

export const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: Edit3 },
  review: { label: 'In Review', color: 'bg-blue-500', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Changes Needed', color: 'bg-red-500', icon: XCircle }
};

export const annotationTypeConfig = {
  comment: { label: 'Comment', color: 'bg-blue-500', icon: MessageSquare },
  suggestion: { label: 'Suggestion', color: 'bg-yellow-500', icon: Pencil },
  approval: { label: 'Approval', color: 'bg-green-500', icon: ThumbsUp },
  'change-request': { label: 'Change Request', color: 'bg-red-500', icon: Flag }
};

export const priorityConfig = {
  low: { label: 'Low', color: 'bg-blue-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-red-500' }
};
