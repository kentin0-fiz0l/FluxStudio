'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, MessageCircle, Book, Bug, Heart } from 'lucide-react';

export default function HelpPage() {
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
          <h1 className="text-xl font-bold text-white">Help & Feedback</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* About MetMap */}
        <section className="bg-hw-surface rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-hw-brass to-hw-peach flex items-center justify-center shadow-knob">
              <span className="text-2xl font-bold text-hw-charcoal">M</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">MetMap</h2>
              <p className="text-sm text-gray-400">Part of Flux Studio</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            MetMap helps musicians track their practice progress by mapping out song structures
            and building confidence in each section. Break down songs into manageable pieces,
            practice with intention, and watch your mastery grow.
          </p>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Support
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <a
              href="https://fluxstudio.art"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Book className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Documentation</p>
                <p className="text-sm text-gray-400">Learn how to use MetMap</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </a>

            <a
              href="mailto:support@fluxstudio.art"
              className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Contact Support</p>
                <p className="text-sm text-gray-400">Get help with issues</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </a>

            <a
              href="https://github.com/fluxstudio/metmap/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Bug className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Report a Bug</p>
                <p className="text-sm text-gray-400">Help us improve</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </a>
          </div>
        </section>

        {/* Acknowledgments */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Made With
          </h2>
          <div className="bg-hw-surface rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Heart className="w-4 h-4 text-hw-peach" />
              <span className="text-sm">by musicians, for musicians</span>
            </div>
          </div>
        </section>

        {/* Version info */}
        <div className="text-center text-gray-500 text-xs space-y-1">
          <p>MetMap v1.0.0</p>
          <p>Build 2025.12.09</p>
        </div>
      </main>
    </div>
  );
}
