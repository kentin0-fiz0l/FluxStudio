import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Download, Mail } from 'lucide-react';

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center"
        >
          <CheckCircle className="w-14 h-14 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold mb-4 text-neutral-900 dark:text-white"
        >
          Payment Successful!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-neutral-500 dark:text-neutral-400 mb-8"
        >
          Thank you for your purchase. Your creative journey begins now!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="font-semibold text-lg mb-4 text-neutral-900 dark:text-white">What happens next?</h2>
          <ul className="text-left space-y-4">
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mr-3 mt-0.5">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Check your email</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  We've sent a confirmation email with your receipt and project details.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mr-3 mt-0.5">
                <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Access your dashboard</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  Your new project is ready in the Projects Hub. Start collaborating!
                </p>
              </div>
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <Link
            to="/projects"
            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-white hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            Go to Projects
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            to="/"
            className="block text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Return to home
          </Link>
        </motion.div>

        {sessionId && (
          <p className="mt-8 text-xs text-neutral-400 dark:text-neutral-500">
            Order reference: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default CheckoutSuccess;
