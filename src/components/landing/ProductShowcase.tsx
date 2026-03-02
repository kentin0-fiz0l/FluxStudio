/**
 * ProductShowcase - Tabbed video-like section with three animated product demos.
 * Each "video" shows a key workflow: collaboration, AI design, and project management.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

import { CollabDemo } from './productShowcase/CollabDemo';
import { AIDemo } from './productShowcase/AIDemo';
import { ProjectDemo } from './productShowcase/ProjectDemo';
import { TABS } from './productShowcase/ProductShowcase.constants';

// Re-export for backward compatibility
export type { ShowcaseTab } from './productShowcase/ProductShowcase.types';
export { TABS } from './productShowcase/ProductShowcase.constants';
export { CollabDemo } from './productShowcase/CollabDemo';
export { AIDemo } from './productShowcase/AIDemo';
export { ProjectDemo } from './productShowcase/ProjectDemo';

// ---------------------------------------------------------------------------
// Main ProductShowcase Component
// ---------------------------------------------------------------------------

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-cycle tabs
  const nextTab = useCallback(() => {
    setActiveTab((prev) => (prev + 1) % TABS.length);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(nextTab, 8000);
    return () => clearInterval(timer);
  }, [isPlaying, nextTab]);

  const tab = TABS[activeTab];
  const DemoComponent = [CollabDemo, AIDemo, ProjectDemo][activeTab];

  return (
    <section
      className="py-24 lg:py-32 relative overflow-hidden"
      aria-labelledby="showcase-heading"
    >
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-secondary-500/5 blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-sans text-sm font-semibold uppercase tracking-widest text-primary-400 mb-4">
            See it in action
          </p>
          <h2
            id="showcase-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4"
          >
            Built for how creative teams{' '}
            <span className="bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 text-transparent bg-clip-text">
              actually work
            </span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Tab list */}
          <div className="w-full lg:w-[320px] flex-shrink-0">
            <div className="flex lg:flex-col gap-2">
              {TABS.map((t, i) => {
                const Icon = t.icon;
                const isActive = i === activeTab;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(i);
                      setIsPlaying(false);
                    }}
                    className={`group flex items-start gap-3 text-left px-4 py-4 rounded-xl transition-all duration-300 flex-1 lg:flex-none focus-visible-ring ${
                      isActive
                        ? 'bg-white/[0.06] border border-white/10'
                        : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                    aria-selected={isActive}
                    role="tab"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-primary-500 to-secondary-500'
                          : 'bg-white/5 group-hover:bg-white/10'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-400'}`}
                      />
                    </div>
                    <div className="hidden lg:block">
                      <div
                        className={`text-sm font-semibold mb-1 transition-colors ${
                          isActive ? 'text-white' : 'text-neutral-400'
                        }`}
                      >
                        {t.label}
                      </div>
                      <div className="text-xs text-neutral-500 leading-relaxed">
                        {t.description}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {isActive && isPlaying && (
                      <motion.div
                        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 8, ease: 'linear' }}
                        key={`progress-${i}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Play/pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="mt-4 flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors focus-visible-ring rounded-md px-2 py-1"
              aria-label={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isPlaying ? 'Auto-playing' : 'Paused'}
            </button>
          </div>

          {/* Demo viewport */}
          <div className="flex-1 w-full">
            <motion.div
              className="relative aspect-[16/10] rounded-xl border border-white/10 overflow-hidden bg-neutral-900 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Tab headline overlay */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab.id}
                  className="absolute inset-0 z-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <DemoComponent />
                </motion.div>
              </AnimatePresence>

              {/* Bottom info bar */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-neutral-900/90 via-neutral-900/50 to-transparent pt-8 pb-4 px-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="font-display text-lg font-bold text-white mb-1">
                      {tab.headline}
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-md">
                      {tab.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/5 via-secondary-500/5 to-accent-500/5 rounded-2xl blur-2xl -z-10 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
