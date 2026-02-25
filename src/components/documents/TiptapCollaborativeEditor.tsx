/**
 * TiptapCollaborativeEditor Component
 *
 * Real-time collaborative rich text editor with Yjs CRDT and WebSocket sync
 */

import { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Undo,
  Redo,
  ArrowLeft,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { useAuth } from '@/store/slices/authSlice';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/apiService';

interface TiptapCollaborativeEditorProps {
  projectId: string;
  documentId: number;
  onBack: () => void;
}

interface DocumentData {
  id: number;
  roomId: string;
  title: string;
  userRole: string;
}

interface Collaborator {
  clientId: number;
  name: string;
  color: string | undefined;
}

interface AwarenessState {
  user?: {
    name?: string;
    color?: string;
  };
}

// Generate a random color for user cursor
function generateColor(userId: string) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

export function TiptapCollaborativeEditor({
  projectId: _projectId,
  documentId,
  onBack,
}: TiptapCollaborativeEditorProps) {
  const { user } = useAuth();
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      const result = await apiService.get<{ document: DocumentData }>(`/api/documents/${documentId}`);
      setDocument(result.data!.document);
      setTitle(result.data!.document.title);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document');
    }
  }, [documentId]);

  // Fetch document details
  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Setup Yjs and WebSocket provider
  useEffect(() => {
    if (!document || !user) return;

    const ydoc = new Y.Doc();
    setDoc(ydoc);

    const token = localStorage.getItem('token');
    const wsUrl = import.meta.env.VITE_COLLAB_URL || 'ws://localhost:4000';

    const wsProvider = new WebsocketProvider(
      wsUrl,
      document.roomId,
      ydoc,
      {
        params: { token: token || '' },
      }
    );

    // Track connection status
    wsProvider.on('status', ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    });

    // Track collaborators
    wsProvider.awareness.on('change', () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const users = states
        .map(([clientId, state]: [number, AwarenessState]) => ({
          clientId,
          name: state.user?.name || 'Anonymous',
          color: state.user?.color,
        }))
        .filter((u) => u.name !== user.name);
      setCollaborators(users);
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [document, user]);

  // Setup Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-expect-error - history is valid but not in type definitions
        history: false, // Disable default history, use Yjs history
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: user
          ? {
              name: user.name,
              color: generateColor(user.id),
            }
          : undefined,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none',
      },
    },
    editable: document?.userRole !== 'viewer',
  }, [doc, provider]);

  // Auto-save title on blur
  const handleTitleBlur = useCallback(async () => {
    if (!document || title === document.title) return;

    try {
      setIsSavingTitle(true);
      await apiService.patch(`/api/documents/${documentId}`, { title });

      toast.success('Document title updated successfully');
    } catch (error) {
      console.error('Error saving title:', error);
      toast.error('Failed to save title');
    } finally {
      setIsSavingTitle(false);
    }
  }, [title, document, documentId]);

  if (!editor || !document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  const isViewer = document.userRole === 'viewer';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-lg font-semibold border-0 focus-visible:ring-0 px-2"
            placeholder="Untitled Document"
            disabled={isViewer || isSavingTitle}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Badge variant={isConnected ? 'primary' : 'secondary'} className="gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" aria-hidden="true" />
                Synced
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" aria-hidden="true" />
                Connecting...
              </>
            )}
          </Badge>

          {/* Collaborators */}
          {collaborators.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              {collaborators.length} online
            </Badge>
          )}

          {/* Viewer Badge */}
          {isViewer && (
            <Badge variant="secondary">
              Read Only
            </Badge>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {!isViewer && (
        <div className="border-b px-4 py-2 flex items-center gap-1 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive('bold') && 'bg-accent')}
          >
            <Bold className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(editor.isActive('italic') && 'bg-accent')}
          >
            <Italic className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent')}
          >
            <Heading1 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent')}
          >
            <Heading2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent')}
          >
            <Heading3 className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(editor.isActive('bulletList') && 'bg-accent')}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(editor.isActive('orderedList') && 'bg-accent')}
          >
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(editor.isActive('codeBlock') && 'bg-accent')}
          >
            <Code className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(editor.isActive('blockquote') && 'bg-accent')}
          >
            <Quote className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
        {editor.storage.characterCount?.characters() || 0} characters •{' '}
        {editor.storage.characterCount?.words() || 0} words
        {isViewer && ' • Read-only mode'}
      </div>
    </div>
  );
}
