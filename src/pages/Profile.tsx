/**
 * Profile Page - Flux Design Language
 *
 * User profile and account management using DashboardLayout.
 */

import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Lock,
  BarChart3,
  FileText,
  MessageSquare,
  Edit
} from 'lucide-react';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Profile' }]}
      onLogout={logout}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/projects"
              className="inline-block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2"
            >
              ← Back to Projects
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Profile</h1>
            <p className="text-neutral-600 mt-1">
              Manage your account information and preferences
            </p>
          </div>
          <Button onClick={() => console.log('Edit profile')}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Personal Information
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Your account details
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="flex-1 px-4 py-3 text-sm border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    User Type
                  </label>
                  <div className="px-4 py-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900 capitalize">
                    {user?.userType || 'Not specified'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    {formatDate(user?.createdAt)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Security Settings
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Manage your account security
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-medium text-neutral-900 mb-1">
                      <Lock className="w-4 h-4" />
                      <span>Change Password</span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      Update your account password
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Change
                  </Button>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors">
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-medium text-neutral-900 mb-1">
                      <Shield className="w-4 h-4" />
                      <span>Two-Factor Authentication</span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Enable
                  </Button>
                </button>
              </div>
            </Card>
          </div>

          {/* Sidebar - Stats and Preferences */}
          <div className="space-y-6">
            {/* Account Stats */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-neutral-900">
                  Account Stats
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Projects Created</span>
                  </div>
                  <span className="text-xl font-bold text-primary-600">3</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Files Uploaded</span>
                  </div>
                  <span className="text-xl font-bold text-success-600">48</span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Messages Sent</span>
                  </div>
                  <span className="text-xl font-bold text-secondary-600">127</span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Quick Actions
              </h3>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/settings')}
                >
                  Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/projects')}
                >
                  My Projects
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/team')}
                >
                  My Teams
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Profile;
