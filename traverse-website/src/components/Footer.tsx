import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Mail, ArrowRight, Linkedin, Twitter } from 'lucide-react'

export default function Footer() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
      setEmail('')
    }
  }

  return (
    <footer id="contact" className="py-32 relative">
      <div className="absolute inset-0 bg-midnight-950" />

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-traverse-500/50 to-transparent" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Stay Updated
          </h2>
          <p className="text-xl text-midnight-400 max-w-xl mx-auto">
            Be the first to know about Arc S2 development milestones and announcements.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md mx-auto mb-20"
        >
          {submitted ? (
            <div className="glass rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="text-green-400" size={28} />
              </div>
              <p className="text-lg font-medium">Thank you for subscribing!</p>
              <p className="text-midnight-400 mt-2">We'll keep you updated on our progress.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-midnight-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 rounded-full bg-white/5 border border-white/10 focus:border-traverse-500/50 focus:outline-none focus:ring-2 focus:ring-traverse-500/20 transition-all placeholder:text-midnight-500"
                  required
                />
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2">
                Subscribe
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="border-t border-white/5 pt-12"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-traverse-400 to-traverse-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M7 14l5-10 5 10-5-2-5 2z" />
                  <path d="M9 16l3 5 3-5-3-1-3 1z" opacity="0.6" />
                </svg>
              </div>
              <span className="font-display font-semibold text-xl tracking-tight">Traverse</span>
            </div>

            <p className="text-midnight-500 text-sm">
              Making distance irrelevant.
            </p>

            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} className="text-midnight-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} className="text-midnight-400" />
              </a>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-midnight-600 text-sm">
              &copy; {new Date().getFullYear()} Traverse. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
