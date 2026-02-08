/**
 * MobileBottomNav - Persistent bottom navigation for mobile
 *
 * 4 items max: Projects, Messages, Search, Menu
 * Thumb-friendly, always visible on mobile.
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  MessageSquare,
  Search,
  Menu,
  X,
  Home,
  Settings,
  Building2,
  Wrench,
  User,
  LogOut,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMessagingOptional } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';

interface MobileBottomNavProps {
  onOpenSearch?: () => void;
  className?: string;
}

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}

function NavItem({ to, icon, label, active, badge, onClick }: NavItemProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-colors relative',
        active
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-neutral-500 dark:text-neutral-400'
      )}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="flex-1">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="flex-1">
      {content}
    </button>
  );
}

export function MobileBottomNav({ onOpenSearch, className }: MobileBottomNavProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useMessagingOptional();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    { to: '/home', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
    { to: '/organization', icon: <Building2 className="w-5 h-5" />, label: 'Organization' },
    { to: '/tools', icon: <Wrench className="w-5 h-5" />, label: 'Tools' },
    { to: '/notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
    { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
    { to: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 z-50 lg:hidden safe-area-inset-bottom',
          className
        )}
      >
        <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
          <NavItem
            to="/projects"
            icon={<Folder className="w-5 h-5" />}
            label="Projects"
            active={isActive('/projects')}
          />
          <NavItem
            to="/messages"
            icon={<MessageSquare className="w-5 h-5" />}
            label="Messages"
            active={isActive('/messages')}
            badge={unreadCount}
          />
          <NavItem
            icon={<Search className="w-5 h-5" />}
            label="Search"
            onClick={onOpenSearch}
          />
          <NavItem
            icon={<Menu className="w-5 h-5" />}
            label="Menu"
            onClick={() => setIsMenuOpen(true)}
            active={isMenuOpen}
          />
        </div>
      </nav>

      {/* Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-2xl z-50 lg:hidden max-h-[80vh] overflow-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 transition-colors',
                      isActive(item.to)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    )}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
                <Button
                  variant="ghost"
                  fullWidth
                  className="justify-start text-error-600 hover:text-error-700 hover:bg-error-50"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </Button>
              </div>

              {/* Safe area padding */}
              <div className="h-safe-area-inset-bottom" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  );
}

export default MobileBottomNav;
