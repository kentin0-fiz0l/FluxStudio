import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/apiService';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [useGoogle, setUseGoogle] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const result = await apiService.post<{ useGoogle?: boolean; message?: string }>('/auth/forgot-password', { email });
      const data = result.data;

      if (data?.useGoogle) {
        setUseGoogle(true);
        setStatus('error');
        setMessage(data.message || '');
      } else {
        setStatus('success');
        setMessage(data?.message || 'Password reset link sent to your email.');
      }
    } catch (_error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FluxStudio
            </h1>
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Check your email</h2>
              <p className="text-gray-400 mb-6">
                We've sent a password reset link to <span className="text-white">{email}</span>
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-400">
                  The link will expire in 1 hour. Check your spam folder if you don't see the email.
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full py-3 px-6 rounded-lg border border-white/10 hover:bg-white/5
                         transition-all font-semibold text-center"
              >
                Back to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-blue-400" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Forgot password?</h2>
                <p className="text-gray-400">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                             focus:border-blue-500 transition-all"
                    placeholder="you@example.com"
                    disabled={status === 'loading'}
                  />
                </div>

                {status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" aria-hidden="true" />
                      <p className="text-sm text-red-400">{message}</p>
                    </div>
                    {useGoogle && (
                      <Link
                        to="/login"
                        className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
                      >
                        Go to login page
                      </Link>
                    )}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                           hover:from-blue-700 hover:to-purple-700 transition-all font-semibold
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <Link
                  to="/login"
                  className="flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                  Back to login
                </Link>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Need help? <a href="mailto:support@fluxstudio.art" className="text-blue-400 hover:text-blue-300">Contact Support</a>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
