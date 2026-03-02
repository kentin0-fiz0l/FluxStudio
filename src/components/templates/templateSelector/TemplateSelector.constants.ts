import * as React from 'react';
import {
  Palette,
  Code,
  Megaphone,
  Music,
  Video,
  Camera,
  Image,
  Star,
  FileText,
  FolderPlus,
} from 'lucide-react';
import { TemplateCategory } from '@/services/templates/types';

export const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  design: React.createElement(Palette, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  development: React.createElement(Code, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  marketing: React.createElement(Megaphone, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  music: React.createElement(Music, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  video: React.createElement(Video, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  photography: React.createElement(Camera, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  branding: React.createElement(Image, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  'social-media': React.createElement(Star, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  presentation: React.createElement(FileText, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  documentation: React.createElement(FileText, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  custom: React.createElement(FolderPlus, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
};

export const AI_SUGGESTION_CHIPS = [
  'Landing page',
  'Dashboard',
  'Mobile app',
  'Portfolio',
  'E-commerce',
] as const;
