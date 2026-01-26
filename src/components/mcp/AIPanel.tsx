/**
 * AI Workspace Panel - Deployment automation sidebar
 * Combines preview creation and log viewing functionality
 */
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import PreviewForm from './PreviewForm';
import LogsViewer from './LogsViewer';

interface AIPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AIPanel({ isOpen: controlledOpen, onClose }: AIPanelProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'logs'>('preview');

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleClose = onClose || (() => setInternalOpen(false));
  const handleOpen = () => setInternalOpen(true);

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-6 rounded-l-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 z-40"
        title="Open AI Workspace"
      >
        <ChevronLeft className="w-5 h-5" />
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            AI Workspace
          </h2>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-white rounded-lg transition-colors"
          title="Close panel"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'preview'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'logs'
              ? 'border-purple-600 text-purple-600 bg-white'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Logs
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'preview' && <PreviewForm />}
        {activeTab === 'logs' && <LogsViewer />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            MCP Server Connected
          </p>
          <p>Powered by Model Context Protocol</p>
        </div>
      </div>
    </div>
  );
}
