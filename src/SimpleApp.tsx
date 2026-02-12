import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load all page components for better performance
const ModernLogin = lazy(() => import('./pages/ModernLogin').then(m => ({ default: m.ModernLogin })));
const ModernSignup = lazy(() => import('./pages/ModernSignup').then(m => ({ default: m.ModernSignup })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const AdaptiveDashboard = lazy(() => import('./components/AdaptiveDashboard').then(m => ({ default: m.AdaptiveDashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Organization = lazy(() => import('./pages/Organization').then(m => ({ default: m.Organization })));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const File = lazy(() => import('./pages/File').then(m => ({ default: m.File })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const MessagesNew = lazy(() => import('./pages/MessagesNew').then(m => ({ default: m.MessagesNew })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.default })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading...</p>
    </div>
  </div>
);

export default function SimpleApp() {
  React.useEffect(() => {
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <MessagingProvider>
            <OrganizationProvider>
                <Router>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<ModernLogin />} />
          <Route path="/signup" element={<ModernSignup />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdaptiveDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <AdaptiveDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization"
            element={
              <ProtectedRoute>
                <Organization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            }
          />
          <Route
            path="/file"
            element={
              <ProtectedRoute>
                <File />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesNew />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
                    </Routes>
                  </Suspense>
                </Router>
            </OrganizationProvider>
          </MessagingProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}