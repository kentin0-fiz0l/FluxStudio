import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-900 via-midnight-950 to-midnight-950" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-traverse-500/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-traverse-600/20 rounded-full blur-[100px]"
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="inline-block px-4 py-2 rounded-full glass text-traverse-400 text-sm font-medium mb-8">
            Introducing Arc S2
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8"
        >
          <span className="block">Personal Flight,</span>
          <span className="gradient-text">Redefined</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl md:text-2xl text-midnight-300 max-w-3xl mx-auto mb-12 text-balance"
        >
          A consumer-owned, autonomous, electric personal air vehicle
          that fits into everyday life — making distance irrelevant.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a href="#arc-s2" className="btn-primary">
            Explore Arc S2
          </a>
          <a href="#vision" className="btn-secondary">
            Our Vision
          </a>
        </motion.div>

        {/* Vehicle silhouette placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 1 }}
          className="mt-20 relative"
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mx-auto w-full max-w-4xl aspect-[16/7]"
          >
            {/* Stylized vehicle representation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 400 150" className="w-full h-full" fill="none">
                {/* Main body */}
                <ellipse cx="200" cy="85" rx="150" ry="35" fill="url(#bodyGradient)" />
                {/* Cockpit */}
                <ellipse cx="200" cy="75" rx="80" ry="25" fill="url(#cockpitGradient)" />
                {/* Left rotor arm */}
                <rect x="30" y="60" width="80" height="8" rx="4" fill="url(#armGradient)" />
                {/* Right rotor arm */}
                <rect x="290" y="60" width="80" height="8" rx="4" fill="url(#armGradient)" />
                {/* Left front rotor */}
                <circle cx="30" cy="64" r="25" fill="url(#rotorGradient)" opacity="0.6" />
                {/* Right front rotor */}
                <circle cx="370" cy="64" r="25" fill="url(#rotorGradient)" opacity="0.6" />
                {/* Left rear rotor arm */}
                <rect x="50" y="100" width="70" height="6" rx="3" fill="url(#armGradient)" />
                {/* Right rear rotor arm */}
                <rect x="280" y="100" width="70" height="6" rx="3" fill="url(#armGradient)" />
                {/* Left rear rotor */}
                <circle cx="50" cy="103" r="20" fill="url(#rotorGradient)" opacity="0.5" />
                {/* Right rear rotor */}
                <circle cx="350" cy="103" r="20" fill="url(#rotorGradient)" opacity="0.5" />
                {/* Highlights */}
                <ellipse cx="200" cy="70" rx="60" ry="15" fill="white" opacity="0.1" />

                <defs>
                  <linearGradient id="bodyGradient" x1="50" y1="50" x2="350" y2="120">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="cockpitGradient" x1="120" y1="50" x2="280" y2="100">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="armGradient" x1="0" y1="0" x2="100%" y2="0">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <radialGradient id="rotorGradient">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            {/* Glow effect under vehicle */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-traverse-500/30 blur-2xl rounded-full" />
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="text-midnight-500" size={32} />
        </motion.div>
      </motion.div>
    </section>
  )
}
