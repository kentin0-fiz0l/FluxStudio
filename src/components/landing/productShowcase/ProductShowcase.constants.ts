import { Users, Sparkles, LayoutDashboard } from 'lucide-react';
import type { ShowcaseTab } from './ProductShowcase.types';

export const TABS: ShowcaseTab[] = [
  {
    id: 'collab',
    icon: Users,
    label: 'Collaboration',
    headline: 'Design together, in real time',
    description:
      'See your team\'s cursors, edits, and comments as they happen. No more "check your email" design reviews.',
  },
  {
    id: 'ai',
    icon: Sparkles,
    label: 'AI Assistant',
    headline: 'AI that understands design',
    description:
      'Get intelligent layout suggestions, color harmony checks, and accessibility audits powered by Claude.',
  },
  {
    id: 'manage',
    icon: LayoutDashboard,
    label: 'Project Hub',
    headline: 'Every project, one dashboard',
    description:
      'Track deadlines, review progress, and manage deliverables across all your creative projects.',
  },
];
