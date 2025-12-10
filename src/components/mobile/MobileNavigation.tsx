import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  FolderOpen,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  User,
  Bell,
  Search,
  Wrench
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: {
    name: string;
    avatar?: string;
    role: string;
  };
  notifications?: number;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentPage,
  onNavigate,
  user,
  notifications = 0
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('.mobile-menu')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Close menu on page navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [currentPage]);

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-gray-900">FluxStudio</span>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <button
              onClick={() => {/* Handle search */}}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => {/* Handle notifications */}}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="mobile-menu p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="mobile-menu lg:hidden fixed top-0 right-0 bottom-0 w-80 bg-white z-50 shadow-2xl"
          >
            {/* Menu Header */}
            <div className="p-6 border-b border-gray-200">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-blue-700' : 'text-gray-500'
                      )} />
                      <span className="font-medium">{item.label}</span>
                      {item.id === 'messages' && notifications > 0 && (
                        <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {notifications > 9 ? '9+' : notifications}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Menu Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {/* Handle logout */}}
                className="w-full flex items-center justify-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation for Phones */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 px-2 py-1">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors',
                  isActive
                    ? 'text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.id === 'messages' && notifications > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};