import type { ConsultationSession } from '../../../types/messaging';

export type { ConsultationSession };

export interface ConsultationWidgetProps {
  consultations?: ConsultationSession[];
  onSchedule?: (consultation: Partial<ConsultationSession>) => Promise<string>;
  onJoin?: (consultationId: string) => void;
  onCancel?: (consultationId: string) => void;
  onReschedule?: (consultationId: string, newDate: Date) => void;
  className?: string;
}

export interface ConsultationFormData {
  title: string;
  description: string;
  type: ConsultationSession['type'];
  scheduledAt: Date;
  duration: number;
  participantIds: string[];
  agenda: string[];
}

export const consultationTypes = [
  { value: 'one-on-one', label: 'One-on-One', icon: 'User', description: 'Private session with client' },
  { value: 'group', label: 'Group Session', icon: 'Users', description: 'Multiple participants' },
  { value: 'workshop', label: 'Workshop', icon: 'Zap', description: 'Collaborative working session' },
  { value: 'review', label: 'Review Session', icon: 'Star', description: 'Design review and feedback' }
] as const;
