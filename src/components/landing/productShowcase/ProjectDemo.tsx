import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function ProjectDemo() {
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
