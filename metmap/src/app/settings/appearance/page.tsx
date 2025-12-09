'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { clsx } from 'clsx';

export default function AppearancePage() {
  // For now, the hardware aesthetic is the only theme
  // This page is a placeholder for future theme options
  const currentTheme = 'hardware';

  return (
    <div className="min-h-screen bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/settings"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Appearance</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Theme Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Theme
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            {/* Hardware Theme (Current) */}
            <button
              className="flex items-center gap-4 p-4 w-full text-left hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-hw-brass to-hw-peach shadow-knob" />
              <div className="flex-1">
                <p className="font-medium text-white">Hardware</p>
                <p className="text-sm text-gray-400">Brass, charcoal, and warm tones</p>
              </div>
              {currentTheme === 'hardware' && (
                <div className="w-6 h-6 rounded-full bg-hw-brass flex items-center justify-center">
                  <Check className="w-4 h-4 text-hw-charcoal" />
                </div>
              )}
            </button>

            {/* More themes coming soon */}
            <div className="flex items-center gap-4 p-4 opacity-50 cursor-not-allowed">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 shadow-knob" />
              <div className="flex-1">
                <p className="font-medium text-white">Dark Mode</p>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 opacity-50 cursor-not-allowed">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 shadow-knob" />
              <div className="flex-1">
                <p className="font-medium text-white">Ocean</p>
                <p className="text-sm text-gray-400">Coming soon</p>
              </div>
            </div>
          </div>
        </section>

        {/* Display Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Display
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-white">Compact view</p>
                <p className="text-sm text-gray-400">Show more items on screen</p>
              </div>
              <div className={clsx(
                'w-12 h-7 rounded-full p-1 transition-colors cursor-not-allowed opacity-50',
                'bg-gray-600'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-white">Show confidence numbers</p>
                <p className="text-sm text-gray-400">Display numeric confidence levels</p>
              </div>
              <div className={clsx(
                'w-12 h-7 rounded-full p-1 transition-colors cursor-not-allowed opacity-50',
                'bg-hw-brass'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow transition-transform translate-x-5" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 px-1">
            More display options coming soon
          </p>
        </section>
      </main>
    </div>
  );
}
