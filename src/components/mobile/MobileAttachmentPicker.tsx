import React from 'react';
import { motion } from 'framer-motion';
import {
  Image,
  Camera,
  Paperclip,
} from 'lucide-react';

interface MobileAttachmentPickerProps {
  onImageClick: () => void;
  onCameraClick: () => void;
  onFileClick: () => void;
}

export const MobileAttachmentPicker: React.FC<MobileAttachmentPickerProps> = ({
  onImageClick,
  onCameraClick,
  onFileClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center justify-center space-x-4 mb-3 py-2"
    >
      <button
        onClick={onImageClick}
        className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Image className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Photo</span>
      </button>

      <button
        onClick={onCameraClick}
        className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Camera</span>
      </button>

      <button
        onClick={onFileClick}
        className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
          <Paperclip className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        </div>
        <span className="text-xs text-gray-600 dark:text-gray-400">File</span>
      </button>
    </motion.div>
  );
};
