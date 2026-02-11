/**
 * Support - Contact Support Form
 *
 * Allows users to submit support requests via a form
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Mail,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://fluxstudio.art';

type TicketCategory = 'general' | 'billing' | 'technical' | 'feature' | 'account';

interface SupportFormData {
  name: string;
  email: string;
  category: TicketCategory;
  subject: string;
  message: string;
}

const categories: { value: TicketCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General Question', description: 'General inquiries about FluxStudio' },
  { value: 'billing', label: 'Billing & Payments', description: 'Questions about invoices, subscriptions, refunds' },
  { value: 'technical', label: 'Technical Issue', description: 'Bugs, errors, or technical problems' },
  { value: 'feature', label: 'Feature Request', description: 'Suggestions for new features' },
  { value: 'account', label: 'Account Issues', description: 'Login problems, account recovery' },
];

export function Support() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [formData, setFormData] = useState<SupportFormData>({
    name: user?.name || '',
    email: user?.email || '',
    category: 'general',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!formData.subject.trim()) {
      setError('Please enter a subject');
      setLoading(false);
      return;
    }

    if (!formData.message.trim() || formData.message.length < 20) {
      setError('Please describe your issue in at least 20 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit support request');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Support submission error:', err);
      // Fallback: open mailto link if API fails
      const mailtoLink = `mailto:support@fluxstudio.art?subject=${encodeURIComponent(
        `[${formData.category.toUpperCase()}] ${formData.subject}`
      )}&body=${encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
      )}`;
      window.location.href = mailtoLink;
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[
          { label: 'Help Center', path: '/help' },
          { label: 'Contact Support' },
        ]}
        onLogout={logout}
        showSearch={false}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
              Request Submitted
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Thank you for contacting us. We'll get back to you within 24-48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/help')} variant="outline">
                Back to Help Center
              </Button>
              <Button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    name: user?.name || '',
                    email: user?.email || '',
                    category: 'general',
                    subject: '',
                    message: '',
                  });
                }}
              >
                Submit Another Request
              </Button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[
        { label: 'Help Center', path: '/help' },
        { label: 'Contact Support' },
      ]}
      onLogout={logout}
      showSearch={false}
    >
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/help')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Contact Support
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              We're here to help. Fill out the form below.
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              Submit a Support Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Your Name
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500">
                  {categories.find((c) => c.value === formData.category)?.description}
                </p>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Subject
                </label>
                <Input
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information."
                  className="w-full px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  required
                />
                <p className="text-xs text-neutral-500">
                  {formData.message.length}/20 characters minimum
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/help')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Alternative Contact */}
        <div className="text-center text-sm text-neutral-500">
          <p>
            Prefer email? Reach us directly at{' '}
            <a
              href="mailto:support@fluxstudio.art"
              className="text-primary-600 hover:underline"
            >
              support@fluxstudio.art
            </a>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Support;
