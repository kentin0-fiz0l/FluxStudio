import React from 'react';
import { Activity, Lock, Unlock } from 'lucide-react';
import { sanitizeRichText, sanitizePlainText } from '../../lib/sanitize';
import { formatContent } from './editor-utils';
import type { Collaborator } from './editor-types';

interface EditorPaneProps {
  editorRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  handleContentChange: (newContent: string) => void;
  isReadOnly: boolean;
  setIsReadOnly: (readOnly: boolean) => void;
  editorMode: 'edit' | 'preview';
  mimeType: string;
  collaborators: Collaborator[];
}

export function EditorPane({
  editorRef,
  content,
  handleContentChange,
  isReadOnly,
  setIsReadOnly,
  editorMode,
  mimeType,
  collaborators,
}: EditorPaneProps) {
  const formatted = formatContent(content, mimeType);

  return (
    <div className="flex-1 flex flex-col">
      {editorMode === 'edit' ? (
        <textarea
          ref={editorRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          readOnly={isReadOnly}
          className="flex-1 p-6 bg-transparent text-white font-mono text-sm leading-relaxed resize-none focus:outline-none"
          placeholder="Start editing..."
          spellCheck={false}
        />
      ) : (
        <div
          className="flex-1 p-6 text-white overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: mimeType.includes('markdown') ? sanitizeRichText(formatted) : sanitizePlainText(formatted) }}
        />
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5">
        <div className="flex items-center space-x-4 text-sm text-white/60">
          <span>{content.length} characters</span>
          <span>{content.split('\n').length} lines</span>
          <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-white/60">
          {collaborators.filter(c => c.isTyping).length > 0 && (
            <div className="flex items-center space-x-1 text-green-400">
              <Activity className="w-4 h-4 animate-pulse" aria-hidden="true" />
              <span>{collaborators.filter(c => c.isTyping).length} typing...</span>
            </div>
          )}
          <button
            onClick={() => setIsReadOnly(!isReadOnly)}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            {isReadOnly ? <Lock className="w-4 h-4" aria-hidden="true" /> : <Unlock className="w-4 h-4" aria-hidden="true" />}
            <span>{isReadOnly ? 'Read-only' : 'Edit mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
