import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  FileText,
  Image,
  Video,
  Eye,
  Download,
  Share2,
} from 'lucide-react';
import type { ProjectFile } from './projectCommunicationMockData';

export function FileCard({ file }: { file: ProjectFile }) {
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Memoize the icon component to avoid creating during render
  const FileIcon = useMemo(() => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return FileText;
  }, [file.type]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileIcon size={16} className="text-gray-600" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900 truncate">{file.name}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.size)} • {file.version} • {file.uploadedBy.name}
              </p>
              <p className="text-xs text-gray-400">
                {file.uploadedAt.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Eye size={14} aria-hidden="true" />
              </button>
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Download size={14} aria-hidden="true" />
              </button>
              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Share2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {file.hasComments && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <MessageSquare size={12} aria-hidden="true" />
                <span>{file.commentCount} comments</span>
              </div>
              {file.isLatestVersion && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Latest
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
