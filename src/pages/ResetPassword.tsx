import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  useEffect(() => {
    // Calculate password strength
    if (password.length === 0) {
      setPasswordStrength('weak');
    } else if (password.length < 8) {
      setPasswordStrength('weak');
    } else if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      setPasswordStrength('strong');
    } else {
      setPasswordStrength('medium');
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setStatus('error');
      setMessage('Please enter a new password');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fluxstudio.art'}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Password reset successfully!');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (_error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthText = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
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
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Password Reset!</h2>
              <p className="text-gray-400 mb-6">
                Your password has been successfully reset. Redirecting to login...
              </p>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-400">
                  Redirecting in 3 seconds...
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-center"
              >
                Go to Login Now
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Create new password</h2>
                <p className="text-gray-400">
                  {email ? `for ${email}` : 'Enter your new password below'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                               placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                               focus:border-blue-500 transition-all pr-12"
                      placeholder="Enter new password"
                      disabled={status === 'loading' || !token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${strengthColors[passwordStrength]}`}
                            style={{
                              width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%',
                            }}
                          />
                        </div>
                        <span className={`text-xs ${
                          passwordStrength === 'weak' ? 'text-red-400' :
                          passwordStrength === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {strengthText[passwordStrength]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                               placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                               focus:border-blue-500 transition-all pr-12"
                      placeholder="Confirm new password"
                      disabled={status === 'loading' || !token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <div className="mt-2 flex items-center text-xs">
                      {password === confirmPassword ? (
                        <span className="text-green-400 flex items-center">
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Passwords match
                        </span>
                      ) : (
                        <span className="text-red-400">Passwords do not match</span>
                      )}
                    </div>
                  )}
                </div>

                {status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-400">{message}</p>
                        {message.includes('expired') && (
                          <Link
                            to="/forgot-password"
                            className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
                          >
                            Request a new reset link
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !token}
                  className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-orange-500 to-red-500
                           hover:from-orange-600 hover:to-red-600 transition-all font-semibold
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <Link
                  to="/login"
                  className="block w-full py-3 px-6 rounded-lg border border-white/10 hover:bg-white/5
                           transition-all font-semibold text-center"
                >
                  Back to Login
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

export default ResetPassword;
