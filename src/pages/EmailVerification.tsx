import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Mail, Loader, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/apiService';

export function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'resend'>('verifying');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const verifyEmail = async (verificationToken: string) => {
    try {
      await apiService.post('/auth/verify-email', { token: verificationToken });
      setStatus('success');
      setMessage('Email verified successfully! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'An error occurred during verification. Please try again.');
    }
  };

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResendEmail = async () => {
    if (!email) {
      setMessage('Email address not found. Please sign up again.');
      return;
    }

    setStatus('verifying');
    setMessage('Sending verification email...');

    try {
      await apiService.post('/auth/resend-verification', { email });
      setStatus('resend');
      setMessage('Verification email sent! Please check your inbox.');
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

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mb-6"
          >
            {status === 'verifying' && (
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader className="h-10 w-10 text-blue-400 animate-spin" aria-hidden="true" />
              </div>
            )}

            {status === 'success' && (
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-white" aria-hidden="true" />
              </div>
            )}

            {status === 'error' && (
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-400" aria-hidden="true" />
              </div>
            )}

            {status === 'resend' && (
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                <Mail className="h-10 w-10 text-blue-400" aria-hidden="true" />
              </div>
            )}
          </motion.div>

          <h2 className="text-2xl font-bold mb-4">
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'resend' && 'Email Sent'}
          </h2>

          <p className="text-gray-400 mb-6">
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && message}
            {status === 'error' && message}
            {status === 'resend' && message}
          </p>

          <div className="space-y-4">
            {status === 'success' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-sm text-green-400">
                  Redirecting to your dashboard in 3 seconds...
                </p>
              </div>
            )}

            {status === 'error' && (
              <button
                onClick={handleResendEmail}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700 transition-all font-semibold
                         flex items-center justify-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Resend Verification Email
              </button>
            )}

            {status === 'resend' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  Check your inbox and click the verification link.
                </p>
              </div>
            )}

            <Link
              to="/login"
              className="block w-full py-3 px-6 rounded-lg border border-white/10 hover:bg-white/5
                       transition-all font-semibold text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Need help? <a href="mailto:support@fluxstudio.art" className="text-blue-400 hover:text-blue-300">Contact Support</a>
        </p>
      </div>
    </div>
  );
}

export default EmailVerification;
