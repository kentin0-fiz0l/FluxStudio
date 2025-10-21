/**
 * Admin Application Router
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * Main router for admin dashboard with authentication protection
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './hooks/useAdminAuth';
import { AdminLogin } from './pages/AdminLogin';
import { AdminLayout } from './AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { BlockedIPs } from './pages/BlockedIPs';
import { Tokens } from './pages/Tokens';
import { Events } from './pages/Events';
import { Performance } from './pages/Performance';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Admin Application Component
 * Sets up all routes for the admin dashboard
 */
export function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route (Public) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard - Default Route */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Security Management */}
          <Route path="blocked-ips" element={<BlockedIPs />} />
          <Route path="tokens" element={<Tokens />} />
          <Route path="events" element={<Events />} />

          {/* System Monitoring */}
          <Route path="performance" element={<Performance />} />

          {/* 404 - Redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AdminApp;
