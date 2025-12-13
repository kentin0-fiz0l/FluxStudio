/**
 * SectionTemplates Component
 *
 * Quick-add buttons for common song sections with preset configurations.
 */

import React from 'react';

export interface SectionTemplate {
  name: string;
  bars: number;
  color?: string;
  icon?: string;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  { name: 'Intro', bars: 4, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { name: 'Verse', bars: 8, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { name: 'Pre-Chorus', bars: 4, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
  { name: 'Chorus', bars: 8, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { name: 'Bridge', bars: 8, color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { name: 'Solo', bars: 8, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { name: 'Breakdown', bars: 4, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { name: 'Outro', bars: 4, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

interface SectionTemplatesProps {
  onAddSection: (template: SectionTemplate) => void;
  compact?: boolean;
  className?: string;
}

export function SectionTemplates({
  onAddSection,
  compact = false,
  className = ''
}: SectionTemplatesProps) {
  if (compact) {
    return (
      <div className={`relative group ${className}`}>
        <button
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Section
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="absolute top-full left-0 mt-1 py-2 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[160px]">
          {SECTION_TEMPLATES.map((template) => (
            <button
              key={template.name}
              onClick={() => onAddSection(template)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span>{template.name}</span>
              <span className="text-xs text-gray-400">{template.bars} bars</span>
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => onAddSection({ name: 'Section', bars: 4 })}
              className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              Custom section...
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {SECTION_TEMPLATES.map((template) => (
        <button
          key={template.name}
          onClick={() => onAddSection(template)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${template.color || 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          title={`Add ${template.name} (${template.bars} bars)`}
        >
          + {template.name}
        </button>
      ))}
    </div>
  );
}

export default SectionTemplates;
