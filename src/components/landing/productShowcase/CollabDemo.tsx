import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function CollabDemo() {
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
