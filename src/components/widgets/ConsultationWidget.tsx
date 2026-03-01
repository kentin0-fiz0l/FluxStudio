import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Video, Plus } from 'lucide-react';
import type { ConsultationWidgetProps, ConsultationFormData } from './consultation/types';
import { defaultMockConsultations } from './consultation/mockData';
import { ConsultationCard } from './consultation/ConsultationCard';
import { ScheduleConsultationForm } from './consultation/ScheduleConsultationForm';

export function ConsultationWidget({
  consultations = defaultMockConsultations,
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
    <div className={`bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Video size={20} className="text-green-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Consultations</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage design sessions and meetings</p>
            </div>
          </div>

          <button
            onClick={() => setShowScheduleForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} aria-hidden="true" />
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
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-200 dark:bg-blue-800/40 text-blue-800 dark:text-blue-300'
                    : 'bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-400'
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
                  <Calendar size={32} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
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
