import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Layers, Volume2, Brain, Home } from 'lucide-react'

const insights = [
  {
    icon: Layers,
    title: 'Above congestion',
    description: 'A new mobility layer that operates above ground-level traffic',
  },
  {
    icon: Home,
    title: 'Independent of airports',
    description: 'No terminals, no gates, no two-hour arrival windows',
  },
  {
    icon: Volume2,
    title: 'Quiet coexistence',
    description: 'Designed to operate harmoniously within communities',
  },
  {
    icon: Brain,
    title: 'Simple for everyone',
    description: 'No pilot license required — autonomous by design',
  },
]

export default function Vision() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="vision" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-950 to-midnight-900" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-2 rounded-full glass text-traverse-400 text-sm font-medium mb-6">
              The Central Insight
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Cities evolved in every dimension
              <span className="gradient-text"> except transportation</span>
            </h2>
            <p className="text-xl text-midnight-300 mb-8">
              Buildings went vertical. Networks went digital. Economies went global.
              But transportation stayed flat — bound to roads and runways.
            </p>
            <p className="text-xl text-midnight-300">
              Traverse Arc introduces a new <span className="text-white font-medium">personal mobility layer</span> —
              one that fits into your life as naturally as your car.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {insights.map((insight, index) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="glass rounded-2xl p-6 hover:bg-white/[0.08] transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-traverse-500/10 flex items-center justify-center mb-4">
                  <insight.icon className="text-traverse-400" size={24} />
                </div>
                <h3 className="font-semibold mb-2">{insight.title}</h3>
                <p className="text-sm text-midnight-400">{insight.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
