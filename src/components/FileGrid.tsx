import { useState } from 'react';
import { File, Image, Video, FileText, Download, Trash2, Edit3, MoreVertical, Eye, Share2 } from 'lucide-react';
import { FileUpload } from '../hooks/useFileUpload';
import { getFileUrl } from '../utils/apiHelpers';

interface FileGridProps {
  files: FileUpload[];
  onDelete: (fileId: string) => void;
  onUpdate: (fileId: string, updates: Partial<Pick<FileUpload, 'description' | 'tags' | 'isPublic'>>) => void;
  className?: string;
}

export function FileGrid({ files, onDelete, onUpdate, className = '' }: FileGridProps) {
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    tags: '',
    isPublic: false
  });

  const getFileIcon = (mimetype: string, size: string = 'w-8 h-8') => {
    if (mimetype.startsWith('image/')) return <Image className={`${size} text-green-400`} />;
    if (mimetype.startsWith('video/')) return <Video className={`${size} text-purple-400`} />;
    if (mimetype.includes('text') || mimetype.includes('document')) return <FileText className={`${size} text-blue-400`} />;
    return <File className={`${size} text-gray-400`} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEdit = (file: FileUpload) => {
    setEditingFile(file.id);
    setEditForm({
      description: file.description || '',
      tags: file.tags?.join(', ') || '',
      isPublic: file.isPublic || false
    });
  };

  const handleSaveEdit = async (fileId: string) => {
    try {
      await onUpdate(fileId, {
        description: editForm.description,
        tags: editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isPublic: editForm.isPublic
      });
      setEditingFile(null);
    } catch (error) {
      console.error('Error updating file:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditForm({ description: '', tags: '', isPublic: false });
  };

  const isImage = (mimetype: string) => mimetype.startsWith('image/');

  if (files.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="mx-auto w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <File className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-lg font-medium text-white/60 mb-2">No files uploaded yet</h3>
        <p className="text-white/40">Upload your first file to get started</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-200 group"
        >
          {/* File Preview */}
          <div className="aspect-video bg-white/5 flex items-center justify-center relative overflow-hidden">
            {isImage(file.mimetype) ? (
              <img
                src={getFileUrl(file.url)}
                alt={file.originalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center space-y-2">
                {getFileIcon(file.mimetype, 'w-12 h-12')}
                <span className="text-xs text-white/60 uppercase tracking-wide">
                  {file.mimetype.split('/')[1]}
                </span>
              </div>
            )}

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
              <button
                onClick={() => window.open(getFileUrl(file.url), '_blank')}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                title="View"
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => handleEdit(file)}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4 text-white" />
              </button>
              <a
                href={getFileUrl(file.url)}
                download={file.originalName}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4 text-white" />
              </a>
              <button
                onClick={() => onDelete(file.id)}
                className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg hover:bg-red-500/30 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          {/* File Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-medium text-white truncate flex-1">
                {file.originalName}
              </h3>
              {file.isPublic && (
                <span title="Public"><Share2 className="w-4 h-4 text-blue-400 ml-2" aria-hidden="true" /></span>
              )}
            </div>

            <div className="space-y-1 text-xs text-white/60">
              <p>{formatFileSize(file.size)}</p>
              <p>Uploaded {formatDate(file.uploadedAt)}</p>
            </div>

            {file.description && (
              <p className="text-xs text-white/70 mt-2 line-clamp-2">
                {file.description}
              </p>
            )}

            {file.tags && file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {file.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {file.tags.length > 3 && (
                  <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded">
                    +{file.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Edit File</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add a description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="design, ui, mockup"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={editForm.isPublic}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="mr-2 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm text-white/80">
                  Make this file public
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleSaveEdit(editingFile)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}