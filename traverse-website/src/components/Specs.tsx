import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const specs = [
  { label: 'Configuration', value: '2-seat, side-by-side' },
  { label: 'Propulsion', value: 'All-electric' },
  { label: 'Control', value: 'Fully autonomous' },
  { label: 'Emissions', value: 'Zero direct' },
  { label: 'Footprint', value: 'Standard parking space' },
  { label: 'Storage', value: 'Garage compatible' },
  { label: 'License', value: 'None required' },
  { label: 'Infrastructure', value: 'Existing' },
]

export default function Specs() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="specs" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-950 to-midnight-900" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full glass text-traverse-400 text-sm font-medium mb-6">
            Technical Overview
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Specifications
          </h2>
          <p className="text-xl text-midnight-400 max-w-2xl mx-auto">
            Designed around constraints, not fantasies. Built for the world that already exists.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass rounded-3xl overflow-hidden">
            {specs.map((spec, index) => (
              <motion.div
                key={spec.label}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
                className={`flex items-center justify-between p-6 ${
                  index !== specs.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <span className="text-midnight-400">{spec.label}</span>
                <span className="font-semibold text-lg">{spec.value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center text-midnight-500 mt-8"
        >
          Additional specifications will be revealed as development progresses.
        </motion.p>
      </div>
    </section>
  )
}
