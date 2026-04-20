import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'

const visionPoints = [
  'Personal air vehicles becoming as normal as EVs',
  'Regional geography flattening',
  'Short-haul commercial flights disappearing',
  'Cities becoming "closer" without becoming denser',
  'Transportation becoming software-orchestrated',
]

export default function Future() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-900 to-midnight-950" />

      {/* Background accent */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-traverse-500/5 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="inline-block px-4 py-2 rounded-full glass text-traverse-400 text-sm font-medium mb-6">
            The Long-Term Vision
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
            It's not about flying.
            <span className="gradient-text"> It's about making distance disappear.</span>
          </h2>

          <div className="space-y-4 mb-12">
            {visionPoints.map((point, index) => (
              <motion.div
                key={point}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-2 h-2 rounded-full bg-traverse-400 flex-shrink-0" />
                <span className="text-lg text-midnight-200">{point}</span>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-xl text-midnight-400 mb-12"
          >
            Arc S2 is the first step, not the end state.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <a
              href="#contact"
              className="inline-flex items-center gap-3 btn-primary text-lg"
            >
              Join the Journey
              <ArrowRight size={20} />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
