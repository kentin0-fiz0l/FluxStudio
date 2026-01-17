import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Car, Plane, Train, Clock } from 'lucide-react'

const problems = [
  {
    icon: Car,
    title: 'Too far to drive',
    description: '50-400 mile trips consume hours of your life on congested roads',
  },
  {
    icon: Plane,
    title: 'Too short to fly',
    description: 'Commercial aviation adds hours of airport time for short distances',
  },
  {
    icon: Train,
    title: 'Rail is limited',
    description: 'High-speed rail is politically slow and geographically constrained',
  },
  {
    icon: Clock,
    title: 'Time is lost',
    description: 'People spend countless hours moving between places that should feel close',
  },
]

export default function Problem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-950 via-midnight-900/50 to-midnight-950" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            The Regional Travel Problem
          </h2>
          <p className="text-xl text-midnight-400 max-w-2xl mx-auto">
            Modern transportation fails at the regional scale. Trips of 50-400 miles
            fall into a frustrating gap.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass rounded-2xl p-8 hover:bg-white/[0.08] transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-6">
                <problem.icon className="text-red-400" size={28} />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{problem.title}</h3>
              <p className="text-midnight-400">{problem.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-2xl md:text-3xl font-display text-midnight-300">
            The problem isn't speed — <span className="text-white">it's layers.</span>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
