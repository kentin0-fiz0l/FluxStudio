import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/slices/authSlice';
import type { CollaborativeEditorProps, Collaborator, Comment } from './editor-types';
import { EditorHeader } from './EditorHeader';
import { EditorPane } from './EditorPane';
import { CommentsSidebar } from './CommentsSidebar';
import { SaveModal } from './SaveModal';

export function CollaborativeEditor({
  fileId: _fileId,
  fileName,
  content: initialContent,
  mimeType,
  collaborators: initialCollaborators,
  onSave,
  onClose
}: CollaborativeEditorProps) {
  const { user } = useAuth();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(initialContent);
  const [isModified, setIsModified] = useState(false);
  const [saveComment, setSaveComment] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(
    initialCollaborators.map(id => ({
      id,
      name: `User ${id}`,
      lastSeen: new Date().toISOString(),
      isTyping: false
    }))
  );
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      text: 'This section needs revision',
      author: 'user-1',
      authorName: 'Alice Johnson',
      createdAt: '2024-10-08T10:00:00Z',
      line: 15,
      resolved: false
    },
    {
      id: '2',
      text: 'Great improvement on the documentation',
      author: 'user-2',
      authorName: 'Bob Smith',
      createdAt: '2024-10-08T11:30:00Z',
      resolved: true
    }
  ]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [undoStack, setUndoStack] = useState<string[]>([initialContent]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);

  // Simulated real-time collaboration
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate other users typing
      setCollaborators(prev => prev.map(collab => ({
        ...collab,
        isTyping: Math.random() > 0.8 && collab.id !== user?.id,
        cursor: collab.id !== user?.id ? {
          line: Math.floor(Math.random() * 50),
          column: Math.floor(Math.random() * 80)
        } : collab.cursor
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const handleContentChange = (newContent: string) => {
    if (isReadOnly) return;

    setContent(newContent);
    setIsModified(true);

    // Add to undo stack
    if (undoStack[undoStack.length - 1] !== content) {
      setUndoStack(prev => [...prev, content]);
      setRedoStack([]);
    }
  };

  const handleSave = () => {
    onSave(content, saveComment);
    setIsModified(false);
    setSaveComment('');
    setShowSaveModal(false);
    setCurrentVersion(prev => prev + 1);
  };

  const handleUndo = () => {
    if (undoStack.length > 1) {
      const previousContent = undoStack[undoStack.length - 2];
      setRedoStack(prev => [content, ...prev]);
      setUndoStack(prev => prev.slice(0, -1));
      setContent(previousContent);
      setIsModified(true);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextContent = redoStack[0];
      setUndoStack(prev => [...prev, content]);
      setRedoStack(prev => prev.slice(1));
      setContent(nextContent);
      setIsModified(true);
    }
  };

  const addComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment,
      author: user?.id || '1',
      authorName: user?.name || 'Current User',
      createdAt: new Date().toISOString(),
      line: selectedLine || undefined,
      resolved: false
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    setSelectedLine(null);
  };

  const resolveComment = (commentId: string) => {
    setComments(prev => prev.map(comment =>
      comment.id === commentId ? { ...comment, resolved: true } : comment
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl w-full h-full m-4 flex flex-col">
        {/* Header */}
        <EditorHeader
          fileName={fileName}
          currentVersion={currentVersion}
          isModified={isModified}
          collaborators={collaborators}
          userId={user?.id}
          editorMode={editorMode}
          setEditorMode={setEditorMode}
          showComments={showComments}
          setShowComments={setShowComments}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          undoStack={undoStack}
          redoStack={redoStack}
          setShowSaveModal={setShowSaveModal}
          onClose={onClose}
          mimeType={mimeType}
        />

        <div className="flex-1 flex">
          {/* Editor/Preview */}
          <EditorPane
            editorRef={editorRef}
            content={content}
            handleContentChange={handleContentChange}
            isReadOnly={isReadOnly}
            setIsReadOnly={setIsReadOnly}
            editorMode={editorMode}
            mimeType={mimeType}
            collaborators={collaborators}
          />

          {/* Comments Sidebar */}
          <CommentsSidebar
            showComments={showComments}
            newComment={newComment}
            setNewComment={setNewComment}
            selectedLine={selectedLine}
            addComment={addComment}
            comments={comments}
            resolveComment={resolveComment}
            userId={user?.id}
          />
        </div>

        {/* Save Modal */}
        <SaveModal
          showSaveModal={showSaveModal}
          setShowSaveModal={setShowSaveModal}
          saveComment={saveComment}
          setSaveComment={setSaveComment}
          handleSave={handleSave}
          currentVersion={currentVersion}
        />
      </div>
    </div>
  );
}
