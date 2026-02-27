/**
 * FeatureVideos - Micro-animation components that bring feature cards to life.
 * Each feature gets a small animated "video" showing the feature in action.
 */
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Design Collaboration Animation
// ---------------------------------------------------------------------------

export function CollabAnimation() {
  return (
    <div className="relative w-full h-24 overflow-hidden rounded-lg bg-neutral-900/50 mb-4">
      {/* Two cursor trails */}
      <motion.div
        className="absolute"
        animate={{
          left: ['15%', '45%', '35%', '55%', '15%'],
          top: ['30%', '20%', '60%', '40%', '30%'],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="10" height="13" viewBox="0 0 16 20" fill="none">
          <path d="M1 1L1 15L5.5 11L10 18L13 16.5L8.5 9.5L14 8L1 1Z" fill="#818cf8" stroke="white" strokeWidth="1" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute"
        animate={{
          left: ['65%', '35%', '55%', '25%', '65%'],
          top: ['50%', '40%', '20%', '60%', '50%'],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="10" height="13" viewBox="0 0 16 20" fill="none">
          <path d="M1 1L1 15L5.5 11L10 18L13 16.5L8.5 9.5L14 8L1 1Z" fill="#22d3ee" stroke="white" strokeWidth="1" />
        </svg>
      </motion.div>
      {/* Shared shape being edited */}
      <motion.div
        className="absolute top-[25%] left-[20%] w-[60%] h-[50%] rounded-lg border border-primary-400/30"
        animate={{
          borderColor: ['rgba(129,140,248,0.3)', 'rgba(34,211,238,0.3)', 'rgba(129,140,248,0.3)'],
          width: ['60%', '55%', '60%'],
          height: ['50%', '55%', '50%'],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smart File Management Animation
// ---------------------------------------------------------------------------

export function FileManagementAnimation() {
  return (
    <div className="relative w-full h-24 overflow-hidden rounded-lg bg-neutral-900/50 mb-4">
      <div className="flex flex-col gap-1.5 p-3">
        {[
          { name: 'hero-v3.fig', color: '#818cf8', w: '85%' },
          { name: 'icons-final.svg', color: '#a855f7', w: '70%' },
          { name: 'brand-guide.pdf', color: '#22d3ee', w: '60%' },
        ].map((file, i) => (
          <motion.div
            key={file.name}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3, duration: 0.4 }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: file.color }}
            />
            <span className="text-[8px] text-neutral-400 truncate">
              {file.name}
            </span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: file.color }}
                animate={{ width: [0, file.w] }}
                transition={{
                  delay: 0.5 + i * 0.3,
                  duration: 1,
                  ease: 'easeOut',
                }}
              />
            </div>
            <motion.span
              className="text-[7px] text-green-400"
              animate={{ opacity: [0, 1] }}
              transition={{ delay: 1.5 + i * 0.3 }}
            >
              synced
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Communication Animation
// ---------------------------------------------------------------------------

export function TeamChatAnimation() {
  return (
    <div className="relative w-full h-24 overflow-hidden rounded-lg bg-neutral-900/50 mb-4 p-3">
      <div className="space-y-1.5">
        {[
          { name: 'S', color: '#818cf8', msg: 'Updated the layout', align: 'left', delay: 0 },
          { name: 'A', color: '#22d3ee', msg: 'Looks great!', align: 'right', delay: 1.5 },
          { name: 'M', color: '#a855f7', msg: 'Approved', align: 'left', delay: 3 },
        ].map((chat) => (
          <motion.div
            key={chat.msg}
            className={`flex items-center gap-1.5 ${chat.align === 'right' ? 'justify-end' : ''}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: chat.delay, duration: 0.4 }}
          >
            {chat.align === 'left' && (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] text-white font-bold flex-shrink-0"
                style={{ backgroundColor: chat.color }}
              >
                {chat.name}
              </div>
            )}
            <div className="bg-white/5 rounded-md px-2 py-1">
              <span className="text-[8px] text-neutral-300">{chat.msg}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow Automation Animation
// ---------------------------------------------------------------------------

export function WorkflowAnimation() {
  return (
    <div className="relative w-full h-24 overflow-hidden rounded-lg bg-neutral-900/50 mb-4 p-3">
      <div className="flex items-center justify-between h-full">
        {[
          { label: 'Design', color: '#818cf8' },
          { label: 'Review', color: '#a855f7' },
          { label: 'Approve', color: '#22d3ee' },
          { label: 'Ship', color: '#22c55e' },
        ].map((step, i) => (
          <div key={step.label} className="flex items-center">
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: step.color }}
              animate={{
                backgroundColor: [
                  'transparent',
                  `${step.color}33`,
                  'transparent',
                ],
                scale: [1, 1.1, 1],
              }}
              transition={{
                delay: i * 1.5,
                duration: 2,
                repeat: Infinity,
                repeatDelay: 4,
              }}
            >
              <span
                className="text-[7px] font-bold"
                style={{ color: step.color }}
              >
                {step.label}
              </span>
            </motion.div>
            {i < 3 && (
              <motion.div
                className="w-4 h-0.5 mx-0.5"
                style={{ backgroundColor: step.color }}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{
                  delay: i * 1.5 + 0.5,
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 4.5,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Analytics Animation
// ---------------------------------------------------------------------------

export function AnalyticsAnimation() {
  return (
    <div className="relative w-full h-24 overflow-hidden rounded-lg bg-neutral-900/50 mb-4 p-3">
      <div className="flex items-end gap-1 h-full pb-3">
        {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-primary-500/60 to-secondary-500/60"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{
              delay: i * 0.08,
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </div>
      {/* Animated line over bars */}
      <motion.div
        className="absolute bottom-3 left-3 right-3 h-0.5"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.6) 50%, transparent 100%)',
        }}
        animate={{ x: ['-50%', '50%', '-50%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enterprise Security Animation
// ---------------------------------------------------------------------------

export function SecurityAnimation() {
  return (
    <div className="relative w-full h-24 overflow-hidden rounded-lg bg-neutral-900/50 mb-4 flex items-center justify-center">
      {/* Shield with pulse */}
      <motion.div
        className="relative"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg
          width="32"
          height="38"
          viewBox="0 0 24 28"
          fill="none"
          className="text-primary-400"
        >
          <path
            d="M12 2L3 6V13C3 19 7 24 12 26C17 24 21 19 21 13V6L12 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="rgba(99,102,241,0.1)"
          />
          <path
            d="M9 14L11 16L15 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* Pulse rings */}
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-full border border-primary-400/30"
            style={{ margin: `-${ring * 8 + 4}px` }}
            animate={{ opacity: [0.3, 0, 0.3], scale: [1, 1.3, 1] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: ring * 0.6,
              ease: 'easeOut',
            }}
          />
        ))}
      </motion.div>
      {/* Encrypted data stream */}
      <div className="absolute right-4 top-3 bottom-3 w-16 overflow-hidden opacity-30">
        <motion.div
          className="text-[6px] font-mono text-primary-400 whitespace-pre leading-tight"
          animate={{ y: [0, -100] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 20 })
            .map(() =>
              Array.from({ length: 8 })
                .map(() => Math.random().toString(36)[2])
                .join(''),
            )
            .join('\n')}
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export map keyed by feature title
// ---------------------------------------------------------------------------

export const FEATURE_ANIMATIONS: Record<string, React.ComponentType> = {
  'Design Collaboration': CollabAnimation,
  'Smart File Management': FileManagementAnimation,
  'Team Communication': TeamChatAnimation,
  'Workflow Automation': WorkflowAnimation,
  'Project Analytics': AnalyticsAnimation,
  'Enterprise Security': SecurityAnimation,
};
