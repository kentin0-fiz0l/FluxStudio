/**
 * Tools Page - External Tools & Applications
 * Completely self-contained - NO external dependencies except React
 */
import React from 'react';

// Inline SVG icons to avoid any import issues
const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const Tools: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-lg" aria-hidden="true">
                🛠️
              </span>
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Tools</h1>
              <p className="text-sm text-slate-400 mt-1">
                Extend your FluxStudio workflow with external apps and integrations.
              </p>
            </div>
          </div>
        </header>

        {/* Featured tool: MetMap */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Featured
            </h2>
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 px-3 py-1 text-xs font-medium border border-emerald-500/40">
              NEW
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/40 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/40">
                <span className="text-xl" aria-hidden="true">
                  🗺️
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">MetMap</h3>
                <p className="text-sm text-slate-300 mt-1">
                  AI-powered meeting intelligence platform for musicians and creatives.
                </p>
                <ul className="mt-3 text-xs text-slate-400 space-y-1">
                  <li>• AI Meeting Transcription</li>
                  <li>• Smart Summaries &amp; action items</li>
                  <li>• Searchable session archive</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
              <a
                href="https://metmap.art"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-sky-900/50 hover:opacity-90 transition"
              >
                Launch MetMap
                <ExternalLinkIcon />
              </a>
              <p className="text-[11px] text-slate-500">
                Opens in a new tab: <span className="text-slate-300">metmap.art</span>
              </p>
            </div>
          </div>
        </section>

        {/* Coming soon */}
        <section>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-4">
            <p className="text-xs font-medium text-sky-300 mb-2">
              More tools coming soon
            </p>
            <p className="text-xs text-slate-300 mb-3">
              We&apos;re building out a growing toolkit of AI-native helpers for design,
              project management, and production workflows.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full bg-slate-800/80 px-3 py-1 border border-slate-700/80">
                AI Design Assistant
              </span>
              <span className="rounded-full bg-slate-800/80 px-3 py-1 border border-slate-700/80">
                Asset Library
              </span>
              <span className="rounded-full bg-slate-800/80 px-3 py-1 border border-slate-700/80">
                Analytics Dashboard
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Tools;
