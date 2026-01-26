import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Video,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Play,
  MoreVertical,
  Zap,
  AlertCircle,
  Star,
  User
} from 'lucide-react';
import {
  ConsultationSession
} from '../../types/messaging';

interface ConsultationWidgetProps {
  consultations?: ConsultationSession[];
  onSchedule?: (consultation: Partial<ConsultationSession>) => Promise<string>;
  onJoin?: (consultationId: string) => void;
  onCancel?: (consultationId: string) => void;
  onReschedule?: (consultationId: string, newDate: Date) => void;
  className?: string;
}

interface ConsultationFormData {
  title: string;
  description: string;
  type: ConsultationSession['type'];
  scheduledAt: Date;
  duration: number;
  participantIds: string[];
  agenda: string[];
}

const mockConsultations: ConsultationSession[] = [
  {
    id: 'consultation-1',
    title: 'Fall 2024 Uniform Design Review',
    description: 'Review and finalize uniform concepts with client feedback integration',
    type: 'review',
    participants: [
      { id: 'client-1', name: 'Director Johnson', userType: 'client', avatar: '/avatars/director.jpg' },
      { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
    ],
    facilitator: { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' },
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    duration: 60,
    status: 'scheduled',
    conversationId: 'conv-consultation-1',
    agenda: [
      'Review current uniform concepts',
      'Discuss client feedback',
      'Color scheme finalization',
      'Timeline and next steps'
    ],
    outcomes: [],
    followUpTasks: [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 'consultation-2',
    title: 'Drill Formation Planning Session',
    description: 'Collaborative planning for halftime show formations and transitions',
    type: 'workshop',
    participants: [
      { id: 'client-1', name: 'Director Johnson', userType: 'client', avatar: '/avatars/director.jpg' },
      { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' },
      { id: 'assistant-1', name: 'Sarah Chen', userType: 'designer', avatar: '/avatars/sarah.jpg' }
    ],
    facilitator: { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' },
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration: 90,
    status: 'scheduled',
    agenda: [
      'Review field layout and positioning',
      'Plan opening formation',
      'Design transition sequences',
      'Finalize ending formation'
    ],
    outcomes: [],
    followUpTasks: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
  },
  {
    id: 'consultation-3',
    title: 'Initial Project Consultation',
    description: 'Kickoff meeting to understand vision and requirements',
    type: 'one-on-one',
    participants: [
      { id: 'client-1', name: 'Director Johnson', userType: 'client', avatar: '/avatars/director.jpg' },
      { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
    ],
    facilitator: { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' },
    scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
    duration: 45,
    status: 'completed',
    conversationId: 'conv-consultation-3',
    notes: 'Discussed theme preferences, color schemes, and timeline. Client emphasized modern, bold design approach.',
    agenda: [
      'Understand project vision',
      'Review timeline and milestones',
      'Discuss design preferences',
      'Establish communication workflow'
    ],
    outcomes: [
      'Theme: Modern and Bold',
      'Primary colors: Navy, Gold, White',
      'Timeline: 8 weeks to completion',
      'Weekly check-ins scheduled'
    ],
    followUpTasks: [
      'Create initial concept sketches',
      'Research modern uniform trends',
      'Prepare mood board presentation'
    ],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
];

const consultationTypes = [
  { value: 'one-on-one', label: 'One-on-One', icon: User, description: 'Private session with client' },
  { value: 'group', label: 'Group Session', icon: Users, description: 'Multiple participants' },
  { value: 'workshop', label: 'Workshop', icon: Zap, description: 'Collaborative working session' },
  { value: 'review', label: 'Review Session', icon: Star, description: 'Design review and feedback' }
];

function ConsultationCard({
  consultation,
  onJoin,
  onCancel,
  onReschedule
}: {
  consultation: ConsultationSession;
  onJoin?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string, newDate: Date) => void;
}) {
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

  const getTypeConfig = (type: ConsultationSession['type']) => {
    return consultationTypes.find(t => t.value === type) || consultationTypes[0];
  };

  const statusConfig = getStatusConfig(consultation.status);
  const typeConfig = getTypeConfig(consultation.type);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  const isUpcoming = consultation.scheduledAt > new Date() && consultation.status === 'scheduled';
  const isToday = consultation.scheduledAt.toDateString() === new Date().toDateString();
  const canJoin = consultation.status === 'scheduled' &&
    Math.abs(consultation.scheduledAt.getTime() - Date.now()) <= 15 * 60 * 1000; // Within 15 minutes

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
      className={`bg-white rounded-lg border transition-all hover:shadow-md ${
        isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon size={16} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">{consultation.title}</h3>
              {isToday && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{consultation.description}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{dateTime.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{dateTime.time} ({consultation.duration}min)</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{consultation.participants.length} participants</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical size={16} />
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
                <Video size={14} />
                Join
              </button>
            )}

            {isUpcoming && (
              <>
                {onReschedule && (
                  <button
                    onClick={() => {
                      // In a real app, this would open a date picker
                      const newDate = new Date(consultation.scheduledAt.getTime() + 24 * 60 * 60 * 1000);
                      onReschedule(consultation.id, newDate);
                    }}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Edit size={14} />
                    Reschedule
                  </button>
                )}

                {onCancel && (
                  <button
                    onClick={() => onCancel(consultation.id)}
                    className="flex items-center gap-1 px-3 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm"
                  >
                    <XCircle size={14} />
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
            className="border-t border-gray-200 bg-gray-50"
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
                        <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
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
                        <AlertCircle size={14} className="text-orange-600 mt-0.5 flex-shrink-0" />
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
}

function ScheduleConsultationForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (data: ConsultationFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<ConsultationFormData>({
    title: '',
    description: '',
    type: 'one-on-one',
    scheduledAt: new Date(),
    duration: 60,
    participantIds: [],
    agenda: ['']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addAgendaItem = () => {
    setFormData(prev => ({
      ...prev,
      agenda: [...prev.agenda, '']
    }));
  };

  const updateAgendaItem = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda.map((item, i) => i === index ? value : item)
    }));
  };

  const removeAgendaItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index)
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Schedule Consultation</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XCircle size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Design Review Session"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ConsultationSession['type'] }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {consultationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            placeholder="Brief description of the consultation purpose..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt.toISOString().slice(0, 16)}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: new Date(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agenda Items
          </label>
          <div className="space-y-2">
            {formData.agenda.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateAgendaItem(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Agenda item ${index + 1}`}
                />
                {formData.agenda.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addAgendaItem}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus size={16} />
              Add agenda item
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Schedule Consultation
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export function ConsultationWidget({
  consultations = mockConsultations,
  onSchedule,
  onJoin,
  onCancel,
  onReschedule,
  className = ''
}: ConsultationWidgetProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const filteredConsultations = useMemo(() => {
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        return consultations.filter(c => c.scheduledAt > now && c.status !== 'cancelled');
      case 'completed':
        return consultations.filter(c => c.status === 'completed');
      default:
        return consultations;
    }
  }, [consultations, activeTab]);

  const upcomingCount = consultations.filter(c =>
    c.scheduledAt > new Date() && c.status !== 'cancelled'
  ).length;

  const handleSchedule = async (formData: ConsultationFormData) => {
    if (onSchedule) {
      try {
        await onSchedule({
          ...formData,
          participants: [],
          facilitator: { id: 'current-user', name: 'Current User', userType: 'designer' },
          status: 'scheduled',
          outcomes: [],
          followUpTasks: []
        });
        setShowScheduleForm(false);
      } catch (error) {
        console.error('Failed to schedule consultation:', error);
      }
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Video size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Consultations</h3>
              <p className="text-sm text-gray-500">Manage design sessions and meetings</p>
            </div>
          </div>

          <button
            onClick={() => setShowScheduleForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Schedule</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { id: 'completed', label: 'Completed', count: consultations.filter(c => c.status === 'completed').length },
            { id: 'all', label: 'All', count: consultations.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {showScheduleForm ? (
            <ScheduleConsultationForm
              onSubmit={handleSchedule}
              onCancel={() => setShowScheduleForm(false)}
            />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {filteredConsultations.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">
                    {activeTab === 'upcoming' ? 'No upcoming consultations' :
                     activeTab === 'completed' ? 'No completed consultations' :
                     'No consultations scheduled'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredConsultations.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      onJoin={onJoin}
                      onCancel={onCancel}
                      onReschedule={onReschedule}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ConsultationWidget;