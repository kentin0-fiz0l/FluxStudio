import type { ConsultationSession } from '../../../types/messaging';

export function createMockConsultations(): ConsultationSession[] {
  const now = Date.now();
  return [
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
      scheduledAt: new Date(now + 2 * 60 * 60 * 1000),
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
      createdAt: new Date(now - 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000)
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
      scheduledAt: new Date(now + 24 * 60 * 60 * 1000),
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
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 1 * 60 * 60 * 1000)
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
      scheduledAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
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
      createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 7 * 24 * 60 * 60 * 1000)
    }
  ];
}

export const defaultMockConsultations = createMockConsultations();
