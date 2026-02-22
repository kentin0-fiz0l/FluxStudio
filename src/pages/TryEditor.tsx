/**
 * TryEditor - Sandbox mode for the Formation Editor
 *
 * Allows unauthenticated users to try the formation editor with a sample formation.
 * Save/export are disabled — shows a "Sign up to save" CTA.
 * This is the primary conversion funnel entry point.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FormationCanvas } from '@/components/formation';
import { ArrowRight, X } from 'lucide-react';

export default function TryEditor() {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = React.useState(true);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top banner — sign up CTA */}
      {showBanner && (
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">You're trying FluxStudio</span>
            <span className="text-indigo-200">—</span>
            <span className="text-indigo-100">Sign up free to save your work and collaborate with your team</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-1 px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              Sign up free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-200 hover:text-white text-sm transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 text-indigo-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor in sandbox mode */}
      <div className="flex-1 overflow-hidden">
        <FormationCanvas
          projectId="sandbox"
          sandboxMode={true}
          collaborativeMode={false}
        />
      </div>
    </div>
  );
}
