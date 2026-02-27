/**
 * TaskDescriptionEditor - Extracted Tiptap rich text editor
 *
 * Lazy-loaded component that wraps Tiptap editor with toolbar,
 * extracted from TaskDetailModal to reduce initial bundle size.
 */

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// Rich Text Editor Toolbar Component
// ============================================================================

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor> | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div
      className="flex items-center gap-1 border-b border-neutral-200 p-2 bg-neutral-50"
      role="toolbar"
      aria-label="Text formatting toolbar"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'h-8 w-8',
          editor.isActive('bold') && 'bg-neutral-200'
        )}
        aria-label="Bold"
        aria-pressed={editor.isActive('bold')}
      >
        <Bold className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'h-8 w-8',
          editor.isActive('italic') && 'bg-neutral-200'
        )}
        aria-label="Italic"
        aria-pressed={editor.isActive('italic')}
      >
        <Italic className="h-4 w-4" aria-hidden="true" />
      </Button>

      <div className="w-px h-6 bg-neutral-300 mx-1" aria-hidden="true" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          'h-8 w-8',
          editor.isActive('bulletList') && 'bg-neutral-200'
        )}
        aria-label="Bullet list"
        aria-pressed={editor.isActive('bulletList')}
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          'h-8 w-8',
          editor.isActive('orderedList') && 'bg-neutral-200'
        )}
        aria-label="Numbered list"
        aria-pressed={editor.isActive('orderedList')}
      >
        <ListOrdered className="h-4 w-4" aria-hidden="true" />
      </Button>

      <div className="w-px h-6 bg-neutral-300 mx-1" aria-hidden="true" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={cn(
          'h-8 w-8',
          editor.isActive('link') && 'bg-neutral-200'
        )}
        aria-label="Insert link"
        aria-pressed={editor.isActive('link')}
      >
        <LinkIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

// ============================================================================
// TaskDescriptionEditor Component
// ============================================================================

export interface TaskDescriptionEditorProps {
  content: string;
  onContentChange: (html: string) => void;
  onCharacterCountChange: (count: number) => void;
  disabled?: boolean;
  error?: string;
}

export const TaskDescriptionEditor: React.FC<TaskDescriptionEditorProps> = ({
  content,
  onContentChange,
  onCharacterCountChange,
  disabled,
  error,
}) => {
  const lastContentRef = React.useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Add task description...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastContentRef.current = html;
      onContentChange(html);
      const text = editor.getText();
      onCharacterCountChange(text.length);
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
        'aria-label': 'Task description editor',
      },
    },
  });

  // Sync content from parent (e.g. when task changes)
  React.useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div>
      <div
        className={cn(
          'border rounded-lg overflow-hidden',
          error
            ? 'border-error-500'
            : 'border-neutral-300 focus-within:border-primary-500 focus-within:ring-3 focus-within:ring-primary-500/20'
        )}
      >
        <EditorToolbar editor={editor} />
        <EditorContent
          editor={editor}
          id="task-description"
          aria-invalid={!!error}
          aria-describedby={
            error ? 'description-error' : 'description-count'
          }
          className={cn(disabled ? 'opacity-50 pointer-events-none' : '')}
        />
      </div>
    </div>
  );
};
