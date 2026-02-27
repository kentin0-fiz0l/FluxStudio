/**
 * HeroDemo - Animated product mockup for the landing hero section.
 * Simulates the FluxStudio collaborative design interface with
 * live cursors, appearing design elements, and chat notifications.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Mock cursor data
// ---------------------------------------------------------------------------

interface Cursor {
  id: string;
  name: string;
  color: string;
  path: { x: number; y: number }[];
}

const CURSORS: Cursor[] = [
  {
    id: 'sarah',
    name: 'Sarah',
    color: '#818cf8', // primary-400
    path: [
      { x: 30, y: 25 },
      { x: 45, y: 40 },
      { x: 60, y: 35 },
      { x: 55, y: 55 },
      { x: 40, y: 50 },
    ],
  },
  {
    id: 'alex',
    name: 'Alex',
    color: '#22d3ee', // accent-400
    path: [
      { x: 70, y: 60 },
      { x: 65, y: 45 },
      { x: 50, y: 50 },
      { x: 55, y: 30 },
      { x: 70, y: 35 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Design elements that "appear" on the canvas
// ---------------------------------------------------------------------------

interface DesignElement {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'image';
  delay: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const DESIGN_ELEMENTS: DesignElement[] = [
  { id: 'card-bg', type: 'rect', delay: 0.8, x: 15, y: 20, w: 35, h: 50, color: 'rgba(99,102,241,0.15)' },
  { id: 'avatar', type: 'circle', delay: 1.4, x: 20, y: 30, w: 8, h: 8, color: 'rgba(168,85,247,0.4)' },
  { id: 'title', type: 'text', delay: 1.8, x: 22, y: 42, w: 24, h: 3, color: 'rgba(255,255,255,0.6)' },
  { id: 'body', type: 'text', delay: 2.0, x: 22, y: 47, w: 20, h: 2, color: 'rgba(255,255,255,0.3)' },
  { id: 'body2', type: 'text', delay: 2.1, x: 22, y: 51, w: 16, h: 2, color: 'rgba(255,255,255,0.2)' },
  { id: 'img', type: 'image', delay: 2.5, x: 55, y: 20, w: 30, h: 30, color: 'rgba(6,182,212,0.12)' },
  { id: 'btn', type: 'rect', delay: 3.0, x: 55, y: 55, w: 14, h: 5, color: 'rgba(99,102,241,0.5)' },
];

// ---------------------------------------------------------------------------
// Chat notification data
// ---------------------------------------------------------------------------

interface ChatBubble {
  id: string;
  name: string;
  message: string;
  delay: number;
  color: string;
}

const CHAT_BUBBLES: ChatBubble[] = [
  { id: 'c1', name: 'Sarah', message: 'Updated the hero layout', delay: 3.5, color: '#818cf8' },
  { id: 'c2', name: 'Alex', message: 'Looks great! Adding CTA', delay: 5.5, color: '#22d3ee' },
  { id: 'c3', name: 'Sarah', message: 'Perfect, shipping it', delay: 7.5, color: '#818cf8' },
];

// ---------------------------------------------------------------------------
// Toolbar items
// ---------------------------------------------------------------------------

const TOOLBAR_ITEMS = [
  { icon: 'M', label: 'Move' },
  { icon: 'R', label: 'Rectangle' },
  { icon: 'O', label: 'Ellipse' },
  { icon: 'T', label: 'Text' },
  { icon: 'P', label: 'Pen' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeroDemo() {
  const [step, setStep] = useState(0);
  const [activeTool, setActiveTool] = useState(0);
  const [visibleChats, setVisibleChats] = useState<string[]>([]);

  // Cycle tool highlight
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTool((prev) => (prev + 1) % TOOLBAR_ITEMS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Advance animation step
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 60);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // Show chat bubbles on schedule
  useEffect(() => {
    const timers = CHAT_BUBBLES.map((chat) =>
      setTimeout(() => {
        setVisibleChats((prev) => [...prev, chat.id]);
        // Remove after 4s
        setTimeout(() => {
          setVisibleChats((prev) => prev.filter((id) => id !== chat.id));
        }, 4000);
      }, chat.delay * 1000),
    );
    // Loop the cycle
    const resetTimer = setTimeout(() => {
      setVisibleChats([]);
    }, 12000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] max-w-lg mx-auto" aria-hidden="true">
      {/* Mock window chrome */}
      <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/10 bg-neutral-900/80 backdrop-blur-xl shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800/80 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-sans text-neutral-500">
              FluxStudio — Brand Redesign
            </span>
          </div>
          {/* Online indicators */}
          <div className="flex -space-x-1.5">
            {CURSORS.map((c) => (
              <div
                key={c.id}
                className="w-5 h-5 rounded-full border-2 border-neutral-800 flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: c.color }}
              >
                {c.name[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Main area: toolbar + canvas */}
        <div className="flex h-[calc(100%-36px)]">
          {/* Toolbar */}
          <div className="w-10 bg-neutral-800/50 border-r border-white/5 flex flex-col items-center py-3 gap-2">
            {TOOLBAR_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-mono transition-colors"
                animate={{
                  backgroundColor:
                    i === activeTool
                      ? 'rgba(99,102,241,0.3)'
                      : 'rgba(255,255,255,0.03)',
                  color: i === activeTool ? '#a5b4fc' : '#6b7280',
                }}
                transition={{ duration: 0.3 }}
              >
                {item.icon}
              </motion.div>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {/* Grid dots background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Design elements appearing */}
            {DESIGN_ELEMENTS.map((el) => (
              <motion.div
                key={el.id}
                className="absolute rounded-md"
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  height: `${el.h}%`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: el.delay,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {el.type === 'circle' ? (
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: el.color }}
                  />
                ) : el.type === 'image' ? (
                  <div
                    className="w-full h-full rounded-lg"
                    style={{
                      backgroundColor: el.color,
                      backgroundImage:
                        'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)',
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-white/20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full h-full rounded-md"
                    style={{ backgroundColor: el.color }}
                  />
                )}
              </motion.div>
            ))}

            {/* Animated cursors */}
            {CURSORS.map((cursor) => {
              const pathIndex = step % cursor.path.length;
              const pos = cursor.path[pathIndex];
              return (
                <motion.div
                  key={cursor.id}
                  className="absolute z-20 pointer-events-none"
                  animate={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Cursor arrow */}
                  <svg
                    width="16"
                    height="20"
                    viewBox="0 0 16 20"
                    fill="none"
                  >
                    <path
                      d="M1 1L1 15L5.5 11L10 18L13 16.5L8.5 9.5L14 8L1 1Z"
                      fill={cursor.color}
                      stroke="white"
                      strokeWidth="1"
                    />
                  </svg>
                  {/* Name badge */}
                  <div
                    className="absolute left-4 top-4 px-2 py-0.5 rounded text-[9px] font-semibold text-white whitespace-nowrap"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.name}
                  </div>
                </motion.div>
              );
            })}

            {/* Selection box animation */}
            <motion.div
              className="absolute border-2 border-primary-400/50 rounded-sm pointer-events-none"
              animate={{
                left: ['20%', '15%', '20%'],
                top: ['25%', '20%', '25%'],
                width: ['30%', '35%', '30%'],
                height: ['40%', '50%', '40%'],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </div>
      </div>

      {/* Chat notifications floating outside */}
      <div className="absolute -right-2 top-12 w-48 flex flex-col gap-2 z-30">
        <AnimatePresence>
          {CHAT_BUBBLES.filter((c) => visibleChats.includes(c.id)).map(
            (chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="bg-neutral-800/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-lg"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                    style={{ backgroundColor: chat.color }}
                  >
                    {chat.name[0]}
                  </div>
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: chat.color }}
                  >
                    {chat.name}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-snug">
                  {chat.message}
                </p>
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>

      {/* Glow effect behind the mock */}
      <div className="absolute -inset-8 bg-gradient-to-r from-primary-500/10 via-secondary-500/10 to-accent-500/10 rounded-3xl blur-3xl -z-10" />
    </div>
  );
}
