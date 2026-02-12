import { useState, useEffect, useRef } from 'react';
import {
  Users,
  Save,
  Eye,
  Edit,
  MessageCircle,
  Activity,
  Clock,
  Lock,
  Unlock,
  Type,
  Code,
  Undo,
  Redo
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CollaborativeEditorProps {
  fileId: string;
  fileName: string;
  content: string;
  mimeType: string;
  collaborators: string[];
  onSave: (content: string, comment?: string) => void;
  onClose: () => void;
}

interface Collaborator {
  id: string;
  name: string;
  cursor?: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  lastSeen: string;
  isTyping: boolean;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  authorName: string;
  createdAt: string;
  line?: number;
  resolved: boolean;
}

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

  const getFileIcon = () => {
    if (mimeType.includes('text') || mimeType.includes('markdown')) {
      return <Type className="w-5 h-5 text-blue-400" />;
    }
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) {
      return <Code className="w-5 h-5 text-yellow-400" />;
    }
    return <Edit className="w-5 h-5 text-gray-400" />;
  };

  const formatContent = () => {
    if (mimeType.includes('markdown')) {
      // Simple markdown preview (would use a proper markdown parser in production)
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
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl w-full h-full m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            {getFileIcon()}
            <div>
              <h2 className="text-xl font-bold text-white">{fileName}</h2>
              <div className="flex items-center space-x-4 text-sm text-white/60">
                <span>Version {currentVersion}</span>
                <span>{isModified ? 'Modified' : 'Saved'}</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{collaborators.length} collaborators</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Collaborators */}
            <div className="flex items-center space-x-2">
              {collaborators.slice(0, 3).map(collaborator => (
                <div
                  key={collaborator.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    collaborator.isTyping ? 'ring-2 ring-blue-400 animate-pulse' : ''
                  } ${
                    collaborator.id === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
                  }`}
                  title={`${collaborator.name}${collaborator.isTyping ? ' (typing...)' : ''}`}
                >
                  {collaborator.name[0]}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setEditorMode('edit')}
                className={`px-3 py-1 rounded text-sm ${
                  editorMode === 'edit' ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={`px-3 py-1 rounded text-sm ${
                  editorMode === 'preview' ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-2 rounded-lg transition-colors ${
                showComments ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            <button
              onClick={handleUndo}
              disabled={undoStack.length <= 1}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Undo className="w-5 h-5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Redo className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!isModified}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>

            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Editor/Preview */}
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
                dangerouslySetInnerHTML={{ __html: formatContent() }}
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
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>{collaborators.filter(c => c.isTyping).length} typing...</span>
                  </div>
                )}
                <button
                  onClick={() => setIsReadOnly(!isReadOnly)}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  {isReadOnly ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  <span>{isReadOnly ? 'Read-only' : 'Edit mode'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Comments Sidebar */}
          {showComments && (
            <div className="w-80 border-l border-white/10 bg-white/5 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Comments</h3>

                {/* Add Comment */}
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-white/60">
                      {selectedLine && (
                        <span>Line {selectedLine}</span>
                      )}
                    </div>
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map(comment => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg border ${
                      comment.resolved
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-white text-sm">{comment.authorName}</div>
                        <div className="text-xs text-white/60 flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(comment.createdAt).toLocaleString()}</span>
                          {comment.line && <span>• Line {comment.line}</span>}
                        </div>
                      </div>
                      {!comment.resolved && comment.author !== user?.id && (
                        <button
                          onClick={() => resolveComment(comment.id)}
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                    <p className="text-white/80 text-sm">{comment.text}</p>
                    {comment.resolved && (
                      <div className="mt-2 text-xs text-green-400">✓ Resolved</div>
                    )}
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">No comments yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl p-6 w-96">
              <h3 className="text-xl font-bold text-white mb-4">Save Changes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Version comment (optional)</label>
                  <textarea
                    value={saveComment}
                    onChange={(e) => setSaveComment(e.target.value)}
                    placeholder="Describe what changed..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Version {currentVersion + 1}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}