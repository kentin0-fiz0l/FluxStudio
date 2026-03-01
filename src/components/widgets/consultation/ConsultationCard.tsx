import { memo, useState } from 'react';
import type { ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Video,
  Edit,
  CheckCircle,
  XCircle,
  Play,
  MoreVertical,
  Zap,
  AlertCircle,
  Star,
  User
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ConsultationSession } from '../../../types/messaging';


const consultationTypeIcons: Record<string, ComponentType<LucideProps>> = {
  'one-on-one': User,
  'group': Users,
  'workshop': Zap,
  'review': Star,
};

interface ConsultationCardProps {
  consultation: ConsultationSession;
  onJoin?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string, newDate: Date) => void;
}

export const ConsultationCard = memo(function ConsultationCard({
  consultation,
  onJoin,
  onCancel,
  onReschedule
}: ConsultationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = (status: ConsultationSession['status']) => {
    switch (status) {
      case 'scheduled':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Calendar, label: 'Scheduled' };
      case 'in_progress':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: Play, label: 'In Progress' };
      case 'completed':
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle, label: 'Completed' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig(consultation.status);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = consultationTypeIcons[consultation.type] || User;

  const [currentTime] = useState(() => Date.now());
  const [today] = useState(() => new Date());

  const isUpcoming = consultation.scheduledAt > today && consultation.status === 'scheduled';
  const isToday = consultation.scheduledAt.toDateString() === today.toDateString();
  const canJoin = consultation.status === 'scheduled' &&
    Math.abs(consultation.scheduledAt.getTime() - currentTime) <= 15 * 60 * 1000;

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const dateTime = formatDateTime(consultation.scheduledAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-neutral-900 rounded-lg border transition-all hover:shadow-md ${
        isToday ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-neutral-700'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon size={16} className="text-gray-600 dark:text-gray-400" aria-hidden="true" />
              <h3 className="font-semibold text-gray-900 dark:text-white">{consultation.title}</h3>
              {isToday && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{consultation.description}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar size={14} aria-hidden="true" />
                <span>{dateTime.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} aria-hidden="true" />
                <span>{dateTime.time} ({consultation.duration}min)</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} aria-hidden="true" />
                <span>{consultation.participants.length} participants</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon size={12} aria-hidden="true" />
              {statusConfig.label}
            </span>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {consultation.participants.slice(0, 4).map((participant) => (
              <div
                key={participant.id}
                className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center"
                title={participant.name}
              >
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-600">
                    {participant.name.charAt(0)}
                  </span>
                )}
              </div>
            ))}
            {consultation.participants.length > 4 && (
              <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  +{consultation.participants.length - 4}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canJoin && onJoin && (
              <button
                onClick={() => onJoin(consultation.id)}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Video size={14} aria-hidden="true" />
                Join
              </button>
            )}

            {isUpcoming && (
              <>
                {onReschedule && (
                  <button
                    onClick={() => {
                      const newDate = new Date(consultation.scheduledAt.getTime() + 24 * 60 * 60 * 1000);
                      onReschedule(consultation.id, newDate);
                    }}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Edit size={14} aria-hidden="true" />
                    Reschedule
                  </button>
                )}

                {onCancel && (
                  <button
                    onClick={() => onCancel(consultation.id)}
                    className="flex items-center gap-1 px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm"
                  >
                    <XCircle size={14} aria-hidden="true" />
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800"
          >
            <div className="p-4 space-y-4">
              {/* Agenda */}
              {consultation.agenda.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Agenda</h4>
                  <ul className="space-y-1">
                    {consultation.agenda.map((item, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Outcomes (for completed sessions) */}
              {consultation.status === 'completed' && consultation.outcomes && consultation.outcomes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Outcomes</h4>
                  <ul className="space-y-1">
                    {consultation.outcomes.map((outcome, index) => (
                      <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                        <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Tasks */}
              {consultation.followUpTasks && consultation.followUpTasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Follow-up Tasks</h4>
                  <ul className="space-y-1">
                    {consultation.followUpTasks.map((task, index) => (
                      <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                        <AlertCircle size={14} className="text-orange-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {consultation.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{consultation.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
