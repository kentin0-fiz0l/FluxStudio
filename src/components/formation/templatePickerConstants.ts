import * as React from 'react';
import { Grid3X3, LayoutGrid, Users, Music } from 'lucide-react';
import { TemplateCategory } from '@/services/formationTemplates/types';

export const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  basic: React.createElement(Grid3X3, { className: 'w-4 h-4', 'aria-hidden': 'true' }),
  intermediate: React.createElement(LayoutGrid, { className: 'w-4 h-4', 'aria-hidden': 'true' }),
  advanced: React.createElement(Users, { className: 'w-4 h-4', 'aria-hidden': 'true' }),
  custom: React.createElement(Users, { className: 'w-4 h-4', 'aria-hidden': 'true' }),
  drill: React.createElement(Music, { className: 'w-4 h-4', 'aria-hidden': 'true' }),
};

export const categoryLabels: Record<TemplateCategory, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  custom: 'Custom',
  drill: 'Drill',
};
