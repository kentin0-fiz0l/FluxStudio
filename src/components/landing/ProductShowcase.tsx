/**
 * ProductShowcase - Tabbed video-like section with three animated product demos.
 * Each "video" shows a key workflow: collaboration, AI design, and project management.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Sparkles, LayoutDashboard, Play, Pause } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

interface ShowcaseTab {
  id: string;
  icon: React.ElementType;
  label: string;
  headline: string;
  description: string;
}

const TABS: ShowcaseTab[] = [
  {
    id: 'collab',
    icon: Users,
    label: 'Collaboration',
    headline: 'Design together, in real time',
    description:
      'See your team\'s cursors, edits, and comments as they happen. No more "check your email" design reviews.',
  },
  {
    id: 'ai',
    icon: Sparkles,
    label: 'AI Assistant',
    headline: 'AI that understands design',
    description:
      'Get intelligent layout suggestions, color harmony checks, and accessibility audits powered by Claude.',
  },
  {
    id: 'manage',
    icon: LayoutDashboard,
    label: 'Project Hub',
    headline: 'Every project, one dashboard',
    description:
      'Track deadlines, review progress, and manage deliverables across all your creative projects.',
  },
];

// ---------------------------------------------------------------------------
// Collaboration Demo
// ---------------------------------------------------------------------------

function CollabDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 40), 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full bg-neutral-900 rounded-lg overflow-hidden">
      {/* Canvas area */}
      <div className="absolute inset-0 p-4">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Shared design frame */}
        <motion.div
          className="absolute top-[15%] left-[10%] w-[50%] h-[60%] rounded-xl border border-white/10 bg-gradient-to-br from-primary-500/10 to-secondary-500/10"
          animate={{
            borderColor: [
              'rgba(129,140,248,0.2)',
              'rgba(168,85,247,0.3)',
              'rgba(129,140,248,0.2)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {/* Header bar */}
          <div className="h-6 border-b border-white/5 flex items-center px-3 gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
          </div>
          {/* Content blocks */}
          <div className="p-3 space-y-2">
            <motion.div
              className="h-3 bg-white/20 rounded-sm"
              style={{ width: '60%' }}
              animate={{ width: ['60%', '75%', '60%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="h-2 bg-white/10 rounded-sm w-[80%]" />
            <div className="h-2 bg-white/10 rounded-sm w-[50%]" />
            <motion.div
              className="mt-3 h-16 rounded-md bg-gradient-to-r from-accent-500/20 to-primary-500/20"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Right panel: properties */}
        <div className="absolute top-[15%] right-[5%] w-[28%] h-[60%] rounded-lg border border-white/5 bg-neutral-800/50 p-2">
          <div className="text-[8px] text-neutral-500 font-semibold uppercase tracking-wider mb-2">
            Properties
          </div>
          <div className="space-y-2">
            {['Width', 'Height', 'Color', 'Opacity'].map((label) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[7px] text-neutral-500">{label}</span>
                <div className="h-1.5 w-10 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Cursor 1: Sarah */}
        <motion.div
          className="absolute z-20"
          animate={{
            left: [`${20 + (phase % 10) * 2}%`, `${25 + ((phase + 5) % 10) * 2}%`],
            top: [`${30 + (phase % 8) * 2}%`, `${35 + ((phase + 3) % 8) * 2}%`],
          }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        >
          <svg width="12" height="16" viewBox="0 0 16 20" fill="none">
            <path
              d="M1 1L1 15L5.5 11L10 18L13 16.5L8.5 9.5L14 8L1 1Z"
              fill="#818cf8"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          <span className="absolute left-3 top-3 bg-primary-500 text-[7px] text-white px-1.5 py-0.5 rounded font-semibold">
            Sarah
          </span>
        </motion.div>

        {/* Cursor 2: Alex */}
        <motion.div
          className="absolute z-20"
          animate={{
            left: [`${55 + ((phase + 7) % 10) * 1.5}%`, `${60 + ((phase + 2) % 10) * 1.5}%`],
            top: [`${25 + ((phase + 4) % 8) * 2}%`, `${20 + ((phase + 6) % 8) * 2}%`],
          }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <svg width="12" height="16" viewBox="0 0 16 20" fill="none">
            <path
              d="M1 1L1 15L5.5 11L10 18L13 16.5L8.5 9.5L14 8L1 1Z"
              fill="#22d3ee"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          <span className="absolute left-3 top-3 bg-accent-500 text-[7px] text-white px-1.5 py-0.5 rounded font-semibold">
            Alex
          </span>
        </motion.div>

        {/* Comment bubble */}
        <motion.div
          className="absolute right-[8%] bottom-[18%] bg-primary-500/90 rounded-lg px-2 py-1.5 max-w-[120px] z-10"
          animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -4] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 0.8, 1] }}
        >
          <p className="text-[7px] text-white leading-snug">
            Love the new gradient! Ship it
          </p>
        </motion.div>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-neutral-800/80 border-t border-white/5 flex items-center px-3 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] text-neutral-400">2 collaborators</span>
        </div>
        <div className="flex-1" />
        <span className="text-[8px] text-neutral-500">100%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Assistant Demo
// ---------------------------------------------------------------------------

function AIDemo() {
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = [
    { role: 'user', text: 'Check contrast ratio for the header text' },
    {
      role: 'ai',
      text: 'Header contrast is 3.8:1 — below WCAG AA. Suggest: darken the background to #1a1a2e or lighten text to #f0f0ff.',
    },
    { role: 'user', text: 'Apply the darker background option' },
    { role: 'ai', text: 'Done! Background updated to #1a1a2e. New contrast ratio: 7.2:1 (WCAG AAA).' },
  ];

  useEffect(() => {
    if (msgIndex < messages.length - 1) {
      const timer = setTimeout(
        () => setMsgIndex((i) => i + 1),
        msgIndex % 2 === 0 ? 2000 : 3000,
      );
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setMsgIndex(0), 4000);
      return () => clearTimeout(timer);
    }
  }, [msgIndex, messages.length]);

  return (
    <div className="relative w-full h-full bg-neutral-900 rounded-lg overflow-hidden flex">
      {/* Design preview side */}
      <div className="w-[55%] relative border-r border-white/5">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Mock design */}
        <div className="absolute top-[12%] left-[10%] w-[80%] h-[70%] rounded-lg overflow-hidden">
          <motion.div
            className="h-[30%] w-full"
            animate={{
              background:
                msgIndex >= 3
                  ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                  : 'linear-gradient(135deg, #2d2d44 0%, #1e2740 100%)',
            }}
            transition={{ duration: 0.8 }}
          >
            <div className="p-3">
              <div className="h-2.5 bg-white/80 rounded w-[50%] mb-1.5" />
              <div className="h-1.5 bg-white/40 rounded w-[70%]" />
            </div>
          </motion.div>
          <div className="h-[70%] w-full bg-neutral-800/50 p-3 space-y-2">
            <div className="h-12 bg-white/5 rounded-md" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-white/5 rounded-md" />
              <div className="h-8 flex-1 bg-white/5 rounded-md" />
            </div>
          </div>
        </div>

        {/* Contrast overlay */}
        <AnimatePresence>
          {(msgIndex === 1 || msgIndex === 3) && (
            <motion.div
              className="absolute top-[14%] left-[12%] w-[30%]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className={`text-[8px] font-bold px-2 py-1 rounded-md text-center ${
                  msgIndex === 3
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                {msgIndex === 3 ? '7.2:1 AAA' : '3.8:1 Fail'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Chat panel */}
      <div className="w-[45%] flex flex-col bg-neutral-850">
        <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-secondary-400" />
          <span className="text-[9px] font-semibold text-neutral-300">
            AI Assistant
          </span>
        </div>
        <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {messages.slice(0, msgIndex + 1).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-2 py-1.5 text-[8px] leading-snug ${
                    msg.role === 'user'
                      ? 'bg-primary-500/20 text-primary-200'
                      : 'bg-white/5 text-neutral-300'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Typing indicator */}
          {msgIndex < messages.length - 1 && msgIndex % 2 === 0 && (
            <motion.div
              className="flex gap-1 px-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  className="w-1 h-1 rounded-full bg-secondary-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: dot * 0.15,
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Management Demo
// ---------------------------------------------------------------------------

function ProjectDemo() {
  const [progress, setProgress] = useState([65, 40, 85, 20]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) =>
        prev.map((p) => {
          const delta = Math.random() * 6 - 2;
          return Math.max(10, Math.min(95, p + delta));
        }),
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const projects = [
    { name: 'Brand Redesign', color: '#818cf8', status: 'In Progress' },
    { name: 'Mobile App UI', color: '#a855f7', status: 'Review' },
    { name: 'Marketing Site', color: '#22d3ee', status: 'Almost Done' },
    { name: 'Icon Library', color: '#f59e0b', status: 'Starting' },
  ];

  return (
    <div className="relative w-full h-full bg-neutral-900 rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-[30%] bg-neutral-800/50 border-r border-white/5 p-3">
        <div className="text-[9px] font-bold text-white mb-3">Projects</div>
        <div className="space-y-2">
          {projects.map((p, i) => (
            <motion.div
              key={p.name}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer"
              animate={{
                backgroundColor:
                  i === 0 ? 'rgba(99,102,241,0.1)' : 'transparent',
              }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-[8px] text-neutral-300 truncate">
                {p.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="absolute left-[30%] top-0 right-0 bottom-0 p-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold text-white">
              Team Overview
            </div>
            <div className="text-[7px] text-neutral-500">4 active projects</div>
          </div>
          <div className="flex gap-1">
            {['Day', 'Week', 'Month'].map((t) => (
              <div
                key={t}
                className={`text-[7px] px-1.5 py-0.5 rounded ${
                  t === 'Week'
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'text-neutral-500'
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          {projects.map((p, i) => (
            <div key={p.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-neutral-300">{p.name}</span>
                <span className="text-[7px] text-neutral-500">{p.status}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: p.color }}
                  animate={{ width: `${progress[i]}%` }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div className="mt-4 h-[25%] flex items-end gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-primary-500/40 to-secondary-500/40"
              animate={{
                height: `${30 + Math.sin(Date.now() / 2000 + i) * 20 + Math.random() * 10}%`,
              }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} className="text-[6px] text-neutral-600 flex-1 text-center">
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
