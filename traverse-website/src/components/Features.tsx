import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Leaf, Clock, Sparkles } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Safety First',
    description:
      'Autonomy as a safety system. Deterministic control is non-negotiable. Redundancy is architecture, not an add-on.',
    color: 'traverse',
  },
  {
    icon: Leaf,
    title: 'Zero Emission',
    description:
      'Fully electric propulsion with zero direct emissions. Contributing to cleaner skies and sustainable regional travel.',
    color: 'green',
  },
  {
    icon: Clock,
    title: 'Time Reclaimed',
    description:
      'Skip the traffic. Skip the airport. Door-to-destination travel that gives you back hours of your life.',
    color: 'amber',
  },
  {
    icon: Sparkles,
    title: 'Effortless Experience',
    description:
      'No pilot license required. Software-defined, appliance-like operation designed for trust, not mastery.',
    color: 'purple',
  },
]

const colorClasses = {
  traverse: {
    bg: 'bg-traverse-500/10',
    text: 'text-traverse-400',
    border: 'border-traverse-500/20',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
}

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="py-32 relative">
      <div className="absolute inset-0 bg-midnight-950" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full glass text-traverse-400 text-sm font-medium mb-6">
            Core Principles
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Designed Around
            <span className="gradient-text"> What Matters</span>
          </h2>
          <p className="text-xl text-midnight-400 max-w-2xl mx-auto">
            Conservative where it must be. Ambitious where it matters.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses]
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`glass rounded-3xl p-8 border ${colors.border} hover:bg-white/[0.03] transition-colors`}
              >
                <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={colors.text} size={28} />
                </div>
                <h3 className="font-display text-2xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-midnight-300 text-lg leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
