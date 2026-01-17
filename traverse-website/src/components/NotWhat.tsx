import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { X } from 'lucide-react'

const notList = [
  'A flying car novelty',
  'A drone taxi fleet',
  'A helicopter replacement',
  'A sci-fi concept vehicle',
  'A pilot-centric aircraft',
]

export default function NotWhat() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 bg-midnight-900" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              What Arc Is
              <span className="text-red-400"> Not</span>
            </h2>
            <p className="text-xl text-midnight-300 mb-8">
              Those paths all fail at scale — socially, regulatory, or economically.
              Traverse Arc takes a different approach.
            </p>
            <p className="text-midnight-400">
              We're building something that works within existing systems, not against them.
              Real innovation happens when technology adapts to human life,
              not the other way around.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            {notList.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <X className="text-red-400" size={20} />
                </div>
                <span className="text-lg text-midnight-200">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
