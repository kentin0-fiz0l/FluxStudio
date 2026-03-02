import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AIDemo() {
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
