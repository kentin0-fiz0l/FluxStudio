import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Users, Zap, Cpu, ParkingSquare } from 'lucide-react'

const highlights = [
  {
    icon: Users,
    label: 'Two seats',
    value: 'Side-by-side',
  },
  {
    icon: Zap,
    label: 'Propulsion',
    value: 'Fully electric',
  },
  {
    icon: Cpu,
    label: 'Control',
    value: 'Autonomous',
  },
  {
    icon: ParkingSquare,
    label: 'Footprint',
    value: 'Parking space',
  },
]

export default function ArcS2() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="arc-s2" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-900 via-midnight-950 to-midnight-950" />

      {/* Accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-traverse-500/10 rounded-full blur-[150px]" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full glass text-traverse-400 text-sm font-medium mb-6">
            The Flagship
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            Arc S2
          </h2>
          <p className="text-xl text-midnight-300 max-w-2xl mx-auto">
            The first realization of our vision. A premium vehicle that happens to fly —
            not an aircraft that people have to learn.
          </p>
        </motion.div>

        {/* Vehicle showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative mb-20"
        >
          <div className="relative mx-auto max-w-5xl aspect-[16/9] rounded-3xl glass overflow-hidden">
            {/* Stylized vehicle interior view */}
            <div className="absolute inset-0 bg-gradient-to-br from-midnight-800 to-midnight-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 600 300" className="w-full h-full p-12" fill="none">
                  {/* Cockpit frame */}
                  <path
                    d="M100 250 Q300 50 500 250"
                    stroke="url(#frameGradient)"
                    strokeWidth="3"
                    fill="none"
                  />
                  {/* Window */}
                  <path
                    d="M120 240 Q300 80 480 240"
                    fill="url(#windowGradient)"
                    opacity="0.3"
                  />
                  {/* Left seat */}
                  <ellipse cx="220" cy="200" rx="60" ry="40" fill="#1e293b" />
                  <ellipse cx="220" cy="195" rx="50" ry="30" fill="#334155" />
                  {/* Right seat */}
                  <ellipse cx="380" cy="200" rx="60" ry="40" fill="#1e293b" />
                  <ellipse cx="380" cy="195" rx="50" ry="30" fill="#334155" />
                  {/* Center console */}
                  <rect x="270" y="170" width="60" height="80" rx="10" fill="#0f172a" />
                  <rect x="280" y="180" width="40" height="30" rx="5" fill="url(#screenGradient)" />
                  {/* HUD elements */}
                  <circle cx="300" cy="120" r="30" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.5" />
                  <circle cx="300" cy="120" r="20" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.3" />
                  <line x1="270" y1="120" x2="330" y2="120" stroke="#0ea5e9" strokeWidth="1" opacity="0.5" />
                  <line x1="300" y1="90" x2="300" y2="150" stroke="#0ea5e9" strokeWidth="1" opacity="0.5" />

                  <defs>
                    <linearGradient id="frameGradient" x1="100" y1="150" x2="500" y2="150">
                      <stop offset="0%" stopColor="#475569" />
                      <stop offset="50%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    <linearGradient id="windowGradient" x1="300" y1="80" x2="300" y2="240">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                    <linearGradient id="screenGradient" x1="280" y1="180" x2="320" y2="210">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Corner accents */}
            <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-traverse-500/30 rounded-tl-xl" />
            <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-traverse-500/30 rounded-tr-xl" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-traverse-500/30 rounded-bl-xl" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-traverse-500/30 rounded-br-xl" />
          </div>
        </motion.div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {highlights.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-traverse-500/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="text-traverse-400" size={28} />
              </div>
              <p className="text-2xl font-display font-semibold mb-1">{item.value}</p>
              <p className="text-midnight-400">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center text-xl text-midnight-300 mt-16 max-w-2xl mx-auto"
        >
          Small enough to fit in a garage. Simple enough to become part of your everyday life.
        </motion.p>
      </div>
    </section>
  )
}
