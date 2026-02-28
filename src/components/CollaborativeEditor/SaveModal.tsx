import { Save } from 'lucide-react';

interface SaveModalProps {
  showSaveModal: boolean;
  setShowSaveModal: (show: boolean) => void;
  saveComment: string;
  setSaveComment: (comment: string) => void;
  handleSave: () => void;
  currentVersion: number;
}

export function SaveModal({
  showSaveModal,
  setShowSaveModal,
  saveComment,
  setSaveComment,
  handleSave,
  currentVersion,
}: SaveModalProps) {
  if (!showSaveModal) return null;

  return (
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
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Save Version {currentVersion + 1}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
