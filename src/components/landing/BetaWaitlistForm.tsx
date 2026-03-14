/**
 * BetaWaitlistForm — Email capture for beta waitlist.
 *
 * Submits to POST /api/beta. Shows success/already-registered states.
 * Designed to sit in the landing page between Hero and ProductShowcase.
 */

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, Loader2, Users } from 'lucide-react';
import { buildApiUrl } from '@/config/environment';

const ROLES = [
  { value: '', label: 'Select your role (optional)' },
  { value: 'band_director', label: 'Band Director' },
  { value: 'drill_writer', label: 'Drill Writer' },
  { value: 'color_guard', label: 'Color Guard Instructor' },
  { value: 'educator', label: 'Educator' },
  { value: 'other', label: 'Other' },
];

export function BetaWaitlistForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch(buildApiUrl('/beta'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: role || undefined }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || "You're on the list!");
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <section className="py-16 bg-neutral-950 border-t border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-neutral-900/60 border border-green-500/20 rounded-2xl p-8"
          >
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{message}</h3>
            <p className="text-neutral-400 text-sm">
              We'll send your invite code to <span className="text-white font-medium">{email}</span> when
              your spot opens up.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-neutral-950 border-t border-neutral-900">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-400" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Beta Access
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Join the Waitlist
          </h2>
          <p className="text-neutral-400 mb-8 max-w-lg mx-auto">
            FluxStudio is in private beta. Drop your email to reserve your
            spot — we're inviting new users every week.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" aria-hidden="true" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm hidden sm:block"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Join Waitlist'
              )}
            </button>
          </form>

          {status === 'error' && (
            <p className="text-red-400 text-sm mt-3">{message}</p>
          )}

          <p className="text-neutral-600 text-xs mt-4">
            No spam, ever. We'll only email you about your beta invite.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default BetaWaitlistForm;
