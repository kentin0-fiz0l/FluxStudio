import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit3
} from 'lucide-react';
import { DesignReview } from '../../../types/messaging';

export function ReviewStatusBadge({ status }: { status: DesignReview['status'] }) {
  const getStatusConfig = (status: DesignReview['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending Review' };
      case 'in_review':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Eye, label: 'In Review' };
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Approved' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' };
      case 'needs_revision':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: Edit3, label: 'Needs Revision' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} aria-hidden="true" />
      {config.label}
    </span>
  );
}
