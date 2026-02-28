/**
 * Helper functions for the CollaborativeEditor component
 */

import React from 'react';
import { Type, Code, Edit } from 'lucide-react';

export function getFileIcon(mimeType: string): React.ReactElement {
  if (mimeType.includes('text') || mimeType.includes('markdown')) {
    return React.createElement(Type, { className: 'w-5 h-5 text-blue-400', 'aria-hidden': 'true' });
  }
  if (mimeType.includes('javascript') || mimeType.includes('typescript')) {
    return React.createElement(Code, { className: 'w-5 h-5 text-yellow-400', 'aria-hidden': 'true' });
  }
  return React.createElement(Edit, { className: 'w-5 h-5 text-gray-400', 'aria-hidden': 'true' });
}

export function formatContent(content: string, mimeType: string): string {
  if (mimeType.includes('markdown')) {
    return content
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-white mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/\n\n/g, '</p><p class="text-white/80 mb-4">')
      .replace(/^/, '<p class="text-white/80 mb-4">')
      .replace(/$/, '</p>');
  }
  return content;
}
